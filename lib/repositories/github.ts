// @ts-nocheck — Drizzle ORM types are complex
import { eq, and, desc, sql, inArray, gte, type SQL } from "drizzle-orm";
import { getDb } from "../db/connection";
import { latestSnapshotRows } from "../utils/latest-snapshot";
import { isMockMode } from "../config";
import * as mock from "../mock";
import {
  github_stats, github_repos, github_contributions,
  github_repo_snapshots, github_traffic_clones, github_traffic_views,
  github_referrers, github_paths, github_releases, github_release_assets,
} from "@/db/schema";


export async function getGithubOverview(accountId: number) {
  if (isMockMode()) return mock.githubOverview;
  const [latest] = await getDb().select().from(github_stats)
    .where(eq(github_stats.account_id, accountId))
    .orderBy(desc(github_stats.recorded_at)).limit(1);
  const allRepos = await getDb().select().from(github_repos)
    .where(eq(github_repos.account_id, accountId)).orderBy(desc(github_repos.stars));
  const pinnedRepos = allRepos.filter(r => r.pinned);
  const repos = pinnedRepos.length > 0 ? pinnedRepos : allRepos;
  const totalStars = allRepos.reduce((s, r) => s + (r.stars ?? 0), 0);
  const totalForks = allRepos.reduce((s, r) => s + (r.forks ?? 0), 0);
  const languages = allRepos.filter(r => r.language).reduce((acc: Record<string, number>, r) => { acc[r.language!] = (acc[r.language!] || 0) + 1; return acc; }, {});
  const topRepos = [...allRepos].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 10);
  return { stats: latest, repos, allRepos, totalStars, totalForks, totalRepos: allRepos.length, languages, topRepos };
}

export async function getGithubTimeline(accountId: number, days = 30) {
  if (isMockMode()) return mock.githubTimeline;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  const { rows } = await getDb().execute<{
    date: string;
    public_repos: number;
    followers: number;
    following: number;
  }>(sql`SELECT DISTINCT ON (SUBSTRING(${github_stats.recorded_at}, 1, 10))
    SUBSTRING(${github_stats.recorded_at}, 1, 10) AS date,
    ${github_stats.public_repos},
    ${github_stats.followers},
    ${github_stats.following}
  FROM ${github_stats}
  WHERE ${github_stats.account_id} = ${accountId}
    AND ${github_stats.recorded_at} >= ${sinceStr}
  ORDER BY SUBSTRING(${github_stats.recorded_at}, 1, 10), ${github_stats.recorded_at} DESC`);
  return rows;
}

export async function getGithubContributions(accountId: number, yr?: number) {
  if (isMockMode()) return mock.githubContributions;
  const conditions: SQL<unknown>[] = [eq(github_contributions.account_id, accountId)];
  if (yr) conditions.push(sql`EXTRACT(YEAR FROM ${github_contributions.date}) = ${String(yr)}`);
  return getDb().select().from(github_contributions).where(and(...conditions)).orderBy(github_contributions.date);
}

export async function upsertGithubRepo(repo: { account_id: number; repo_id: number; name: string; full_name: string; description: string | null; language: string | null; stars: number; forks: number; open_issues: number; topics: string; homepage: string | null; is_fork: number; created_at: string | null; updated_at: string | null; pushed_at: string | null }) {
  await getDb().insert(github_repos).values({ ...repo, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [github_repos.account_id, github_repos.repo_id],
    set: { stars: repo.stars, forks: repo.forks, open_issues: repo.open_issues, topics: repo.topics, language: repo.language, description: repo.description, pushed_at: repo.pushed_at, updated_at: repo.updated_at },
  });
}

export async function setPinnedRepos(accountId: number, repoIds: number[]) {
  if (isMockMode()) return;
  const db = getDb();
  await db.update(github_repos).set({ pinned: 0 }).where(eq(github_repos.account_id, accountId));
  if (repoIds.length > 0) {
    await db.update(github_repos).set({ pinned: 1 })
      .where(and(eq(github_repos.account_id, accountId), sql`repo_id IN (${sql.join(repoIds.map(id => sql`${id}`), sql`, `)})`));
  }
}

export async function insertGithubStats(stats: { account_id: number; public_repos: number; public_gists: number; followers: number; following: number }) {
  await getDb().insert(github_stats).values({ ...stats, recorded_at: sql`NOW()` });
}

export async function upsertGithubContribution(c: { account_id: number; date: string; count: number; level: number }) {
  await getDb().insert(github_contributions).values({ ...c, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [github_contributions.account_id, github_contributions.date],
    set: { count: c.count, level: c.level },
  });
}

export async function upsertGithubContributions(accountId: number, contributions: { date: string; count: number; level: number }[]) {
  if (contributions.length === 0) return;
  await getDb().insert(github_contributions).values(
    contributions.map(c => ({ ...c, account_id: accountId, fetched_at: sql`NOW()` })),
  ).onConflictDoUpdate({
    target: [github_contributions.account_id, github_contributions.date],
    set: { count: sql.raw("excluded.count"), level: sql.raw("excluded.level") },
  });
}

export async function upsertGithubRepoSnapshot(s: { account_id: number; repo_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  await getDb().insert(github_repo_snapshots).values(s).onConflictDoUpdate({
    target: [github_repo_snapshots.account_id, github_repo_snapshots.repo_id, github_repo_snapshots.snapshot_date],
    set: { stars: s.stars, forks: s.forks, open_issues: s.open_issues },
  });
}

export async function getGithubRepoSnapshots(accountId: number, repoId: number, days = 30) {
  if (isMockMode()) return mock.githubSnapshots;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  return getDb().select({
    stars: github_repo_snapshots.stars, forks: github_repo_snapshots.forks,
    open_issues: github_repo_snapshots.open_issues, date: github_repo_snapshots.snapshot_date,
  }).from(github_repo_snapshots)
    .where(and(eq(github_repo_snapshots.account_id, accountId), eq(github_repo_snapshots.repo_id, repoId), gte(github_repo_snapshots.snapshot_date, sinceStr)))
    .orderBy(github_repo_snapshots.snapshot_date);
}

export async function upsertGithubTrafficClones(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  await getDb().insert(github_traffic_clones).values(t).onConflictDoUpdate({
    target: [github_traffic_clones.account_id, github_traffic_clones.repo_id, github_traffic_clones.date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubTrafficClones(accountId: number, repoId: number, days = 30) {
  if (isMockMode()) return mock.githubClones;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  return getDb().select().from(github_traffic_clones)
    .where(and(eq(github_traffic_clones.account_id, accountId), eq(github_traffic_clones.repo_id, repoId), gte(github_traffic_clones.date, sinceStr)))
    .orderBy(github_traffic_clones.date);
}

export async function upsertGithubTrafficViews(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  await getDb().insert(github_traffic_views).values(t).onConflictDoUpdate({
    target: [github_traffic_views.account_id, github_traffic_views.repo_id, github_traffic_views.date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubTrafficViews(accountId: number, repoId: number, days = 30) {
  if (isMockMode()) return mock.githubViews;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  return getDb().select().from(github_traffic_views)
    .where(and(eq(github_traffic_views.account_id, accountId), eq(github_traffic_views.repo_id, repoId), gte(github_traffic_views.date, sinceStr)))
    .orderBy(github_traffic_views.date);
}

export async function upsertGithubReferrer(t: { account_id: number; repo_id: number; referrer: string; count: number; uniques: number; snapshot_date: string }) {
  await getDb().insert(github_referrers).values(t).onConflictDoUpdate({
    target: [github_referrers.account_id, github_referrers.repo_id, github_referrers.referrer, github_referrers.snapshot_date],
    set: { count: t.count, uniques: t.uniques },
  });
}

export async function getGithubReferrers(accountId: number, repoId: number) {
  if (isMockMode()) return mock.githubReferrers;
  const all = await getDb().select().from(github_referrers)
    .where(and(eq(github_referrers.account_id, accountId), eq(github_referrers.repo_id, repoId)))
    .orderBy(desc(github_referrers.count));
  return latestSnapshotRows(all);
}

export async function getGithubReferrerHistory(accountId: number, repoId: number, days = 30) {
  if (isMockMode()) return mock.githubReferrerHistory;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  return getDb().select().from(github_referrers)
    .where(and(eq(github_referrers.account_id, accountId), eq(github_referrers.repo_id, repoId), gte(github_referrers.snapshot_date, sinceStr)))
    .orderBy(github_referrers.referrer, github_referrers.snapshot_date);
}

export async function upsertGithubPath(t: { account_id: number; repo_id: number; path: string; title: string | null; count: number; uniques: number; snapshot_date: string }) {
  await getDb().insert(github_paths).values(t).onConflictDoUpdate({
    target: [github_paths.account_id, github_paths.repo_id, github_paths.path, github_paths.snapshot_date],
    set: { count: t.count, uniques: t.uniques, title: t.title },
  });
}

export async function getGithubPaths(accountId: number, repoId: number) {
  if (isMockMode()) return mock.githubPaths;
  const all = await getDb().select().from(github_paths)
    .where(and(eq(github_paths.account_id, accountId), eq(github_paths.repo_id, repoId)))
    .orderBy(desc(github_paths.count));
  return latestSnapshotRows(all);
}

export async function getGithubPathHistory(accountId: number, repoId: number, days = 30) {
  if (isMockMode()) return mock.githubPathHistory;
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  return getDb().select().from(github_paths)
    .where(and(eq(github_paths.account_id, accountId), eq(github_paths.repo_id, repoId), gte(github_paths.snapshot_date, sinceStr)))
    .orderBy(github_paths.path, github_paths.snapshot_date);
}

export async function upsertGithubRelease(r: { account_id: number; repo_id: number; release_id: number; tag_name: string | null; name: string | null; body: string | null; prerelease: number; published_at: string | null; html_url: string | null; total_downloads: number }) {
  await getDb().insert(github_releases).values({ ...r, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [github_releases.account_id, github_releases.repo_id, github_releases.release_id],
    set: { tag_name: r.tag_name, name: r.name, body: r.body, prerelease: r.prerelease, published_at: r.published_at, html_url: r.html_url, total_downloads: r.total_downloads },
  });
}

export async function getGithubReleases(accountId: number, repoId: number) {
  if (isMockMode()) return mock.githubReleases;
  const all = await getDb().select().from(github_releases)
    .where(and(eq(github_releases.account_id, accountId), eq(github_releases.repo_id, repoId)));
  const latest = new Map<string, typeof all[0]>();
  for (const r of all) {
    if (!latest.has(r.tag_name!) || r.release_id > latest.get(r.tag_name!)!.release_id) {
      latest.set(r.tag_name!, r);
    }
  }
  const releases = [...latest.values()].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));

  const releaseIds = releases.map((r) => r.id);
  const allAssets = releaseIds.length > 0
    ? await getDb().select().from(github_release_assets)
        .where(inArray(github_release_assets.release_id, releaseIds))
    : [];

  const assetsMap = new Map<number, typeof allAssets>();
  for (const a of allAssets) {
    if (!assetsMap.has(a.release_id)) assetsMap.set(a.release_id, []);
    assetsMap.get(a.release_id)!.push(a);
  }

  return releases.map((r) => ({
    ...r,
    assets: assetsMap.get(r.id) || [],
  }));
}

export async function insertGithubReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; content_type: string | null; browser_download_url: string | null }) {
  await getDb().insert(github_release_assets).values({
    release_id: a.release_db_id, name: a.name, download_count: a.download_count,
    size: a.size, content_type: a.content_type, browser_download_url: a.browser_download_url,
  });
}

export async function getGithubReleaseAssets(releaseDbId: number) {
  if (isMockMode()) return mock.githubReleaseAssets;
  return getDb().select().from(github_release_assets)
    .where(eq(github_release_assets.release_id, releaseDbId));
}
