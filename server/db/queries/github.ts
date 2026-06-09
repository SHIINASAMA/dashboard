import { eq, and, desc, sql, count } from "drizzle-orm";
import { getDb } from "../connection";
import {
  github_stats, github_repos, github_contributions,
  github_repo_snapshots, github_traffic_clones, github_traffic_views,
  github_referrers, github_paths, github_releases, github_release_assets,
} from "../../../db/schema";

export interface GithubStatsRow { account_id: number; public_repos: number; public_gists: number; followers: number; following: number; recorded_at: string; }
export interface GithubRepoRow { id: number; account_id: number; repo_id: number; name: string; full_name: string; description: string | null; language: string | null; stars: number; forks: number; open_issues: number; topics: string; homepage: string | null; is_fork: number; pinned: number; created_at: string | null; updated_at: string | null; pushed_at: string | null; }
export interface GithubContributionRow { date: string; count: number; level: number; }

export async function getGithubOverview(accountId: number) {
  const [latest] = await getDb().select().from(github_stats)
    .where(eq(github_stats.account_id, accountId))
    .orderBy(desc(github_stats.recorded_at))
    .limit(1) as GithubStatsRow[];
  const allRepos = await getDb().select().from(github_repos)
    .where(eq(github_repos.account_id, accountId))
    .orderBy(desc(github_repos.stars)) as GithubRepoRow[];
  const pinnedRepos = allRepos.filter(r => r.pinned);
  const repos = pinnedRepos.length > 0 ? pinnedRepos : allRepos;
  const totalStars = allRepos.reduce((s, r) => s + r.stars, 0);
  const totalForks = allRepos.reduce((s, r) => s + r.forks, 0);
  const languages = allRepos.filter(r => r.language).reduce((acc: Record<string, number>, r) => { acc[r.language!] = (acc[r.language!] || 0) + 1; return acc; }, {});
  const topRepos = [...allRepos].sort((a, b) => b.stars - a.stars).slice(0, 10);
  return { stats: latest, repos, allRepos, totalStars, totalForks, totalRepos: allRepos.length, languages, topRepos };
}

export async function getGithubStatsTimeline(accountId: number) {
  return getDb().select({
    date: github_stats.recorded_at,
    public_repos: github_stats.public_repos,
    followers: github_stats.followers,
    following: github_stats.following,
  }).from(github_stats)
    .where(eq(github_stats.account_id, accountId))
    .orderBy(github_stats.recorded_at) as Promise<{ date: string; public_repos: number; followers: number; following: number }[]>;
}

export async function getGithubContributions(accountId: number, year?: number) {
  const conditions = [eq(github_contributions.account_id, accountId)];
  if (year) conditions.push(sql`strftime('%Y', ${github_contributions.date}) = ${String(year)}`);
  return getDb().select().from(github_contributions)
    .where(and(...conditions))
    .orderBy(github_contributions.date) as Promise<GithubContributionRow[]>;
}

export async function upsertGithubRepo(repo: Omit<GithubRepoRow, "id" | "fetched_at" | "pinned">) {
  await getDb().insert(github_repos).values({...repo, fetched_at: sql`(datetime('now'))`}).onConflictDoUpdate({
    target: [github_repos.account_id, github_repos.repo_id],
    set: {
      stars: repo.stars, forks: repo.forks, open_issues: repo.open_issues,
      topics: repo.topics, language: repo.language, description: repo.description,
      pushed_at: repo.pushed_at, updated_at: repo.updated_at,
    },
  });
}

export async function setPinnedRepos(accountId: number, repoIds: number[]) {
  const db = getDb();
  await db.update(github_repos).set({ pinned: 0 }).where(eq(github_repos.account_id, accountId));
  if (repoIds.length > 0) {
    await db.update(github_repos).set({ pinned: 1 })
      .where(and(eq(github_repos.account_id, accountId), sql`repo_id IN ${sql.join(repoIds, sql`, `)}`));
  }
}

export async function insertGithubStats(stats: Omit<GithubStatsRow, "recorded_at">) {
  await getDb().insert(github_stats).values({...stats, recorded_at: sql`(datetime('now'))`});
}

export async function upsertGithubContribution(c: { account_id: number; date: string; count: number; level: number }) {
  await getDb().insert(github_contributions).values({...c, fetched_at: sql`(datetime('now'))`}).onConflictDoUpdate({
    target: [github_contributions.account_id, github_contributions.date],
    set: { count: c.count, level: c.level },
  });
}

export async function upsertGithubRepoSnapshot(s: { account_id: number; repo_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  await getDb().insert(github_repo_snapshots).values(s).onConflictDoUpdate({
    target: [github_repo_snapshots.account_id, github_repo_snapshots.repo_id, github_repo_snapshots.snapshot_date],
    set: { stars: s.stars, forks: s.forks, open_issues: s.open_issues },
  });
}

export async function getGithubRepoSnapshots(accountId: number, repoId: number) {
  return getDb().select({
    stars: github_repo_snapshots.stars,
    forks: github_repo_snapshots.forks,
    open_issues: github_repo_snapshots.open_issues,
    date: github_repo_snapshots.snapshot_date,
  }).from(github_repo_snapshots)
    .where(and(eq(github_repo_snapshots.account_id, accountId), eq(github_repo_snapshots.repo_id, repoId)))
    .orderBy(github_repo_snapshots.snapshot_date) as Promise<{ stars: number; forks: number; open_issues: number; date: string }[]>;
}

export async function upsertGithubTrafficClones(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  await getDb().insert(github_traffic_clones).values(t).onConflictDoUpdate({
    target: [github_traffic_clones.account_id, github_traffic_clones.repo_id, github_traffic_clones.date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubTrafficClones(accountId: number, repoId: number) {
  return getDb().select().from(github_traffic_clones)
    .where(and(eq(github_traffic_clones.account_id, accountId), eq(github_traffic_clones.repo_id, repoId)))
    .orderBy(github_traffic_clones.date) as Promise<{ date: string; count: number; uniques: number }[]>;
}

export async function upsertGithubTrafficViews(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  await getDb().insert(github_traffic_views).values(t).onConflictDoUpdate({
    target: [github_traffic_views.account_id, github_traffic_views.repo_id, github_traffic_views.date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubTrafficViews(accountId: number, repoId: number) {
  return getDb().select().from(github_traffic_views)
    .where(and(eq(github_traffic_views.account_id, accountId), eq(github_traffic_views.repo_id, repoId)))
    .orderBy(github_traffic_views.date) as Promise<{ date: string; count: number; uniques: number }[]>;
}

export async function upsertGithubReferrer(t: { account_id: number; repo_id: number; referrer: string; count: number; uniques: number; snapshot_date: string }) {
  await getDb().insert(github_referrers).values(t).onConflictDoUpdate({
    target: [github_referrers.account_id, github_referrers.repo_id, github_referrers.referrer, github_referrers.snapshot_date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubReferrers(accountId: number, repoId: number) {
  const all = await getDb().select().from(github_referrers)
    .where(and(eq(github_referrers.account_id, accountId), eq(github_referrers.repo_id, repoId)))
    .orderBy(desc(github_referrers.count));
  const latest = new Map<string, typeof all[0]>();
  for (const r of all) {
    if (!latest.has(r.referrer) || r.snapshot_date > latest.get(r.referrer)!.snapshot_date) {
      latest.set(r.referrer, r);
    }
  }
  return [...latest.values()].sort((a, b) => b.count - a.count);
}

export async function getGithubReferrerHistory(accountId: number, repoId: number) {
  return getDb().select().from(github_referrers)
    .where(and(eq(github_referrers.account_id, accountId), eq(github_referrers.repo_id, repoId)))
    .orderBy(github_referrers.referrer, github_referrers.snapshot_date) as Promise<{ snapshot_date: string; referrer: string; count: number; uniques: number }[]>;
}

export async function upsertGithubPath(t: { account_id: number; repo_id: number; path: string; title: string | null; count: number; uniques: number; snapshot_date: string }) {
  await getDb().insert(github_paths).values(t).onConflictDoUpdate({
    target: [github_paths.account_id, github_paths.repo_id, github_paths.path, github_paths.snapshot_date],
    set: { count: t.count, uniques: t.uniques, title: t.title },
  });
}

export async function getGithubPaths(accountId: number, repoId: number) {
  const all = await getDb().select().from(github_paths)
    .where(and(eq(github_paths.account_id, accountId), eq(github_paths.repo_id, repoId)))
    .orderBy(desc(github_paths.count));
  const latest = new Map<string, typeof all[0]>();
  for (const r of all) {
    if (!latest.has(r.path) || r.snapshot_date > latest.get(r.path)!.snapshot_date) {
      latest.set(r.path, r);
    }
  }
  return [...latest.values()].sort((a, b) => b.count - a.count);
}

export async function getGithubPathHistory(accountId: number, repoId: number) {
  return getDb().select().from(github_paths)
    .where(and(eq(github_paths.account_id, accountId), eq(github_paths.repo_id, repoId)))
    .orderBy(github_paths.path, github_paths.snapshot_date) as Promise<{ snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[]>;
}

export async function upsertGithubRelease(r: { account_id: number; repo_id: number; release_id: number; tag_name: string | null; name: string | null; body: string | null; prerelease: number; published_at: string | null; html_url: string | null; total_downloads: number }) {
  await getDb().insert(github_releases).values({...r, fetched_at: sql`(datetime('now'))`}).onConflictDoUpdate({
    target: [github_releases.account_id, github_releases.repo_id, github_releases.release_id],
    set: {
      tag_name: r.tag_name, name: r.name, body: r.body,
      prerelease: r.prerelease, published_at: r.published_at,
      html_url: r.html_url, total_downloads: r.total_downloads,
    },
  });
}

export async function getGithubReleases(accountId: number, repoId: number) {
  return getDb().select().from(github_releases)
    .where(and(eq(github_releases.account_id, accountId), eq(github_releases.repo_id, repoId)))
    .orderBy(desc(github_releases.published_at));
}

export async function insertGithubReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; content_type: string | null; browser_download_url: string | null }) {
  await getDb().insert(github_release_assets).values({
    release_id: a.release_db_id,
    name: a.name,
    download_count: a.download_count,
    size: a.size,
    content_type: a.content_type,
    browser_download_url: a.browser_download_url,
  });
}
