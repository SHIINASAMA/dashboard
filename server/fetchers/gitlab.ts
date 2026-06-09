import type { AccountRow } from "../db";
import {
  insertGitlabStats,
  upsertGitlabProject,
  upsertGitlabProjectSnapshot,
  upsertGitlabContribution,
  upsertGitlabRelease,
  insertGitlabReleaseAsset,
} from "../db";

function getApiBase(account: AccountRow): string {
  if (account.instance_url) {
    return account.instance_url.replace(/\/+$/, "") + "/api/v4";
  }
  return "https://gitlab.com/api/v4";
}

interface GlApiResponse<T> {
  data: T;
  nextPage: number | null;
}

function getProxyAgent(): any {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  if (!proxyUrl) return undefined;
  try {
    const { hostname, port } = new URL(proxyUrl);
    if (hostname && port) {
      // Bun supports proxy natively via HTTP_PROXY/HTTPS_PROXY env vars
      // but for explicit control we use the proxy option
      return proxyUrl;
    }
  } catch {}
  return undefined;
}

async function glFetch<T>(apiBase: string, path: string, token: string): Promise<GlApiResponse<T>> {
  const url = `${apiBase}${path}`;
  const proxy = getProxyAgent();
  const fetchOpts: any = {
    headers: {
      "PRIVATE-TOKEN": token,
      "User-Agent": "dashboard",
    },
    proxy: proxy,
  };
  // Only disable TLS verification for self-hosted instances (non-gitlab.com)
  if (!apiBase.includes("gitlab.com")) {
    fetchOpts.tls = { rejectUnauthorized: false };
  }
  const res = await fetch(url, fetchOpts).catch((e: any) => {
    throw new Error(`GitLab network error: ${e.message || e}`);
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
    throw new Error(`GitLab rate limited. Retry after ${retryAfter}s`);
  }

  if (res.status === 401) {
    throw new Error(`GitLab API 401: token invalid or expired. Check your PAT at ${apiBase.replace("/api/v4", "")}/-/user_settings/personal_access_tokens`);
  }

  if (!res.ok) {
    throw new Error(`GitLab API ${res.status}: ${res.statusText} for ${url}`);
  }

  const data = await res.json() as T;
  // GitLab uses RFC 5988 Link headers for pagination
  const linkHeader = res.headers.get("Link");
  let nextPage: number | null = null;
  if (linkHeader) {
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    if (match) {
      nextPage = parseInt(match[1], 10);
    }
  }
  return { data, nextPage };
}

async function fetchAllPages<T>(
  apiBase: string,
  path: string,
  token: string,
  maxPages = 20,
): Promise<T[]> {
  let results: T[] = [];
  let page = 1;
  const sep = path.includes("?") ? "&" : "?";
  while (page <= maxPages) {
    const pagedPath = `${path}${sep}page=${page}&per_page=100`;
    const { data } = await glFetch<T[]>(apiBase, pagedPath, token);
    if (Array.isArray(data) && data.length > 0) {
      results = results.concat(data);
    }
    // Check if we got less than expected — this means we're done
    if (!Array.isArray(data) || data.length < 100) break;
    page++;
  }
  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGitlabAccount(account: AccountRow) {
  const apiBase = getApiBase(account);
  const token = account.auth_token;
  const today = new Date().toISOString().slice(0, 10);
  let errorMessages: string[] = [];

  try {
    // 1. Fetch authenticated user profile
    console.log(`[GitLab] Fetching user profile from ${apiBase}...`);
    const { data: user } = await glFetch<any>(apiBase, "/user", token);

    if (!user || !user.id) {
      throw new Error("Invalid GitLab token or user not found");
    }

    // Insert stats snapshot
    insertGitlabStats({
      account_id: account.id,
      public_projects: 0, // will be updated after fetching projects
      followers: user.followers ?? 0,
      following: user.following ?? 0,
    });

    // 2. Fetch all projects for this user (membership=true for owned+contributed projects)
    console.log(`[GitLab] Fetching projects for ${account.screen_name}...`);
    const projects = await fetchAllPages<any>(
      apiBase,
      `/users/${user.id}/projects?membership=true&order_by=updated_at`,
      token,
    );

    console.log(`[GitLab] Found ${projects.length} projects for ${account.screen_name}`);
    let totalStars = 0;
    let totalForks = 0;
    let totalIssues = 0;

    for (const p of projects) {
      if (!p.id) continue;

      const topics = JSON.stringify(p.topics || []);
      const snapDate = new Date().toISOString().slice(0, 10);

      upsertGitlabProject({
        account_id: account.id,
        project_id: p.id,
        name: p.name,
        path_with_namespace: p.path_with_namespace || p.path,
        description: p.description || null,
        language: p.language || null,
        stars: p.star_count ?? 0,
        forks: p.forks_count ?? 0,
        open_issues: p.open_issues_count ?? 0,
        topics,
        homepage: p.homepage || null,
        is_fork: p.forked_from_project ? 1 : 0,
        visibility: p.visibility || "public",
        created_at: p.created_at || null,
        updated_at: p.updated_at || null,
        last_activity_at: p.last_activity_at || null,
      });

      upsertGitlabProjectSnapshot({
        account_id: account.id,
        project_id: p.id,
        stars: p.star_count ?? 0,
        forks: p.forks_count ?? 0,
        open_issues: p.open_issues_count ?? 0,
        snapshot_date: snapDate,
      });

      totalStars += p.star_count ?? 0;
      totalForks += p.forks_count ?? 0;
      totalIssues += p.open_issues_count ?? 0;

      // 3. Fetch releases for this project
      try {
        await sleep(200);
        const releases = await fetchAllPages<any>(
          apiBase,
          `/projects/${p.id}/releases`,
          token,
          3,
        );

        for (const rel of releases) {
          if (!rel.tag_name) continue;
          // Compute total download count from assets (link assets + source downloads)
          const downloadCount = ((rel.assets?.sources || []) as any[]).reduce(
            (s: number, src: any) => s + (src.download_count || 0),
            0,
          );

          upsertGitlabRelease({
            account_id: account.id,
            project_id: p.id,
            release_tag: rel.tag_name,
            name: rel.name || null,
            description: rel.description || null,
            released_at: rel.released_at || null,
            created_at: rel.created_at || null,
          });

          // We'd need the release row id to insert assets, but since releases
          // are keyed by (account_id, project_id, release_tag), we can just
          // store asset data at the same time. For now, we skip per-file assets
          // and just track the total download count on the release.
        }
      } catch (e: any) {
        errorMessages.push(`Releases for ${p.name}: ${e.message}`);
      }
    }

    // Update stats with accurate project count
    insertGitlabStats({
      account_id: account.id,
      public_projects: projects.length,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
    });

    // 4. Fetch contribution data via events API
    try {
      console.log(`[GitLab] Fetching contribution events for ${account.screen_name}...`);
      // We aggregate only push events (most likely to match GitHub-style contribution)
      const events = await fetchAllPages<any>(
        apiBase,
        `/users/${user.id}/events?action=pushed&after=${new Date().getFullYear() - 1}-01-01`,
        token,
        10,
      );

      const countByDate = new Map<string, number>();
      for (const event of events) {
        const date = event.created_at?.slice(0, 10);
        if (date) {
          countByDate.set(date, (countByDate.get(date) || 0) + 1);
        }
      }

      for (const [date, count] of countByDate) {
        upsertGitlabContribution({
          account_id: account.id,
          date,
          count,
        });
      }

      console.log(`[GitLab] Recorded ${countByDate.size} contribution days for ${account.screen_name}`);
    } catch (e: any) {
      errorMessages.push(`Contributions: ${e.message}`);
    }

    // Update account with success
    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      user_id: String(user.id),
      error_message: errorMessages.length > 0 ? errorMessages.join("; ") : null,
    });

    console.log(`[GitLab] Fetch complete for ${account.screen_name}: ${projects.length} projects`);
    return projects.length;
  } catch (e: any) {
    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: e.message || "GitLab fetch failed",
    });
    console.error(`[GitLab] Fetch failed for ${account.screen_name}:`, e.message);
    throw e;
  }
}
