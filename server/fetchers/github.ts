import type { AccountRow } from "../db";
import { upsertGithubRepo, insertGithubStats, upsertGithubContribution, updateAccount } from "../db";

const GITHUB_API = "https://api.github.com";

async function ghFetch(path: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "x-kit-dashboard",
  };
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (res.status === 403) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API 403: ${body.slice(0, 200)}`);
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

    // Save GitHub user ID
    const ghId = String(userData.id);
    if (ghId && ghId !== account.user_id) {
      updateAccount(account.id, { user_id: ghId });
    }

    console.log(`[GitHub Fetcher] @${username}: stats recorded (${userData.followers} followers, ${userData.public_repos} repos)`);

    // 2. Fetch repos (up to 100)
    await sleep(1000);
    const repos: any[] = await ghFetch(`/users/${username}/repos?per_page=100&sort=updated`, token);

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
    }

    console.log(`[GitHub Fetcher] @${username}: ${repos.length} repos saved`);

    // 3. Fetch contribution calendar (from GitHub GraphQL)
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
      error_message: null,
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
