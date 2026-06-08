import type { AccountRow } from "../db";
import {
  upsertGithubRepo, insertGithubStats, upsertGithubContribution, updateAccount,
  upsertGithubRepoSnapshot,
  upsertGithubTrafficClones, upsertGithubTrafficViews,
  upsertGithubReferrer, upsertGithubPath,
  upsertGithubRelease, insertGithubReleaseAsset, getDb,
} from "../db";

const GITHUB_API = "https://api.github.com";

async function ghFetch(path: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "x-kit-dashboard",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (res.status === 403) {
    const body = await res.text().catch(() => "");
    const err = new Error(`GitHub API 403: ${body.slice(0, 200)}`);
    throw err;
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchGithubAccount(account: AccountRow) {
  console.log(`[GitHub Fetcher] Fetching @${account.screen_name}...`);

  try {
    const token = account.auth_token;
    const username = account.screen_name;

    // 1. Fetch user profile
    const userData: any = await ghFetch(`/users/${username}`, token);
    await sleep(500);

    insertGithubStats({
      account_id: account.id,
      public_repos: userData.public_repos || 0,
      public_gists: userData.public_gists || 0,
      followers: userData.followers || 0,
      following: userData.following || 0,
    });

    const ghId = String(userData.id);
    if (ghId && ghId !== account.user_id) {
      updateAccount(account.id, { user_id: ghId });
    }

    console.log(`[GitHub Fetcher] @${username}: stats recorded (${userData.followers} followers, ${userData.public_repos} repos)`);

    // 2. Fetch repos (up to 100)
    await sleep(1000);
    const repos: any[] = await ghFetch(`/users/${username}/repos?per_page=100&sort=updated`, token);

    const today = new Date().toISOString().slice(0, 10);
    let trafficError: string | null = null;

    for (const repo of repos) {
      upsertGithubRepo({
        account_id: account.id,
        repo_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        open_issues: repo.open_issues_count || 0,
        topics: JSON.stringify(repo.topics || []),
        homepage: repo.homepage,
        is_fork: repo.fork ? 1 : 0,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
      });

      upsertGithubRepoSnapshot({
        account_id: account.id,
        repo_id: repo.id,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        open_issues: repo.open_issues_count || 0,
        snapshot_date: today,
      });
    }

    console.log(`[GitHub Fetcher] @${username}: ${repos.length} repos saved + snapshots recorded`);

    // 3. Fetch traffic & releases for each repo (requires classic PAT with repo scope)
    if (token) {
      for (const repo of repos) {
        await sleep(800);
        const err = await fetchRepoTraffic(account.id, repo.id, repo.full_name, token);
        if (err && !trafficError) trafficError = err;
        await sleep(600);
        await fetchRepoReleases(account.id, repo.id, repo.full_name, token);
      }
      if (trafficError) {
        console.warn(`[GitHub Fetcher] @${username}: traffic fetch issue — ${trafficError}`);
      } else {
        console.log(`[GitHub Fetcher] @${username}: traffic & releases fetched`);
      }
    } else {
      console.log(`[GitHub Fetcher] @${username}: no token — skipping traffic & releases`);
    }

    // 4. Fetch contribution calendar
    await sleep(1000);
    try {
      const year = new Date().getFullYear();
      const contributions = await fetchContributions(username, token, year);
      for (const c of contributions) {
        upsertGithubContribution({ account_id: account.id, ...c });
      }
      console.log(`[GitHub Fetcher] @${username}: ${contributions.length} contributions saved`);
    } catch (e: any) {
      console.warn(`[GitHub Fetcher] @${username}: contributions fetch skipped (${e.message})`);
    }

    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: trafficError || null,
    });

    console.log(`[GitHub Fetcher] @${username}: done`);
    return true;
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error(`[GitHub Fetcher] @${account.screen_name} error:`, msg);
    updateAccount(account.id, { error_message: msg });
    return false;
  }
}

async function fetchRepoTraffic(accountId: number, repoId: number, fullName: string, token: string): Promise<string | null> {
  const [owner, repo] = fullName.split("/");

  // Clones
  try {
    const clones: any = await ghFetch(`/repos/${owner}/${repo}/traffic/clones`, token);
    if (clones?.clones) {
      for (const day of clones.clones) {
        upsertGithubTrafficClones({
          account_id: accountId,
          repo_id: repoId,
          date: day.timestamp?.slice(0, 10) || day.date,
          count: day.count || 0,
          uniques: day.uniques || 0,
        });
      }
    }
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes("403")) return "GitHub API returned 403 — your PAT needs repo scope (classic token, not fine-grained)";
    if (msg.includes("401")) return "GitHub API returned 401 — invalid token";
    return null;
  }

  // Views
  try {
    const views: any = await ghFetch(`/repos/${owner}/${repo}/traffic/views`, token);
    if (views?.views) {
      for (const day of views.views) {
        upsertGithubTrafficViews({
          account_id: accountId,
          repo_id: repoId,
          date: day.timestamp?.slice(0, 10) || day.date,
          count: day.count || 0,
          uniques: day.uniques || 0,
        });
      }
    }
  } catch (e) { /* views may be unavailable */ }

  // Referrers
  try {
    const referrers: any[] = await ghFetch(`/repos/${owner}/${repo}/traffic/popular/referrers`, token);
    const today = new Date().toISOString().slice(0, 10);
    if (referrers) {
      for (const r of referrers) {
        upsertGithubReferrer({
          account_id: accountId,
          repo_id: repoId,
          referrer: r.referrer || "unknown",
          count: r.count || 0,
          uniques: r.uniques || 0,
          snapshot_date: today,
        });
      }
    }
  } catch (e) { /* referrers may be unavailable */ }

  // Popular paths
  try {
    const paths: any[] = await ghFetch(`/repos/${owner}/${repo}/traffic/popular/paths`, token);
    const today = new Date().toISOString().slice(0, 10);
    if (paths) {
      for (const p of paths) {
        upsertGithubPath({
          account_id: accountId,
          repo_id: repoId,
          path: p.path || "/",
          title: p.title || null,
          count: p.count || 0,
          uniques: p.uniques || 0,
          snapshot_date: today,
        });
      }
    }
  } catch (e) { /* paths may be unavailable */ }

  return null;
}

async function fetchRepoReleases(accountId: number, repoId: number, fullName: string, token: string) {
  try {
    const releases: any[] = await ghFetch(`/repos/${fullName}/releases?per_page=30`, token);
    if (!releases) return;

    const db = getDb();
    const upsertStmt = db.prepare(`
      INSERT INTO github_releases (account_id,repo_id,release_id,tag_name,name,body,prerelease,published_at,html_url,total_downloads)
      VALUES(?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(account_id,repo_id,release_id) DO UPDATE SET
        tag_name=excluded.tag_name,name=excluded.name,body=excluded.body,
        prerelease=excluded.prerelease,published_at=excluded.published_at,
        html_url=excluded.html_url,total_downloads=excluded.total_downloads
    `);

    for (const release of releases) {
      const totalDownloads = (release.assets || []).reduce((s: number, a: any) => s + (a.download_count || 0), 0);

      const result = upsertStmt.run(
        accountId, repoId, release.id, release.tag_name || null,
        release.name || null, release.body || null,
        release.prerelease ? 1 : 0,
        release.published_at || null, release.html_url || null, totalDownloads,
      );

      // Get the local DB id of the inserted/updated release
      const releaseRow = db.query(
        "SELECT id FROM github_releases WHERE account_id = ? AND repo_id = ? AND release_id = ?"
      ).get(accountId, repoId, release.id) as any;

      if (releaseRow) {
        for (const asset of release.assets || []) {
          insertGithubReleaseAsset({
            release_db_id: releaseRow.id,
            name: asset.name,
            download_count: asset.download_count || 0,
            size: asset.size || 0,
            content_type: asset.content_type || null,
            browser_download_url: asset.browser_download_url || null,
          });
        }
      }
    }
  } catch (e) { /* releases may be unavailable */ }
}

async function fetchContributions(username: string, token: string | undefined, year: number) {
  const query = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `.replace(/\s+/g, " ");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "x-kit-dashboard",
  };
  if (token) headers.Authorization = `bearer ${token}`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  const body: any = await res.json();
  if (body.errors) throw new Error(body.errors[0].message);

  const weeks = body.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
  const days: { date: string; count: number; level: number }[] = [];

  for (const week of weeks) {
    for (const day of week.contributionDays || []) {
      days.push({
        date: day.date,
        count: day.contributionCount || 0,
        level: day.contributionLevel || 0,
      });
    }
  }

  return days;
}
