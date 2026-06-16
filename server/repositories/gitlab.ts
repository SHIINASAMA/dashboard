import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/connection";
import {
  gitlab_stats, gitlab_projects, gitlab_project_snapshots,
  gitlab_releases, gitlab_release_assets, gitlab_contributions,
} from "../../db/schema";

export async function getGitlabOverview(accountId: number) {
  const [latest] = await getDb().select().from(gitlab_stats)
    .where(eq(gitlab_stats.account_id, accountId)).orderBy(desc(gitlab_stats.recorded_at)).limit(1);
  const allProjects = await getDb().select().from(gitlab_projects)
    .where(eq(gitlab_projects.account_id, accountId)).orderBy(desc(gitlab_projects.stars));
  const pinnedProjects = allProjects.filter(r => r.pinned);
  const projects = pinnedProjects.length > 0 ? pinnedProjects : allProjects;
  const totalStars = allProjects.reduce((s, r) => s + (r.stars ?? 0), 0);
  const totalForks = allProjects.reduce((s, r) => s + (r.forks ?? 0), 0);
  const languages = allProjects.filter(r => r.language).reduce((acc: Record<string, number>, r) => { acc[r.language!] = (acc[r.language!] || 0) + 1; return acc; }, {});
  const topProjects = [...allProjects].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 10);
  return { stats: latest, projects, allProjects, totalStars, totalForks, totalProjects: allProjects.length, languages, topProjects };
}

export async function getGitlabTimeline(accountId: number) {
  const { rows } = await getDb().execute<{
    date: string;
    public_projects: number;
    followers: number;
    following: number;
  }>(sql`SELECT DISTINCT ON (SUBSTRING(${gitlab_stats.recorded_at}, 1, 10))
    SUBSTRING(${gitlab_stats.recorded_at}, 1, 10) AS date,
    ${gitlab_stats.public_projects},
    ${gitlab_stats.followers},
    ${gitlab_stats.following}
  FROM ${gitlab_stats}
  WHERE ${gitlab_stats.account_id} = ${accountId}
  ORDER BY SUBSTRING(${gitlab_stats.recorded_at}, 1, 10), ${gitlab_stats.recorded_at} DESC`);
  return rows;
}

export async function getGitlabContributions(accountId: number, yr?: number) {
  const conditions: SQL<unknown>[] = [eq(gitlab_contributions.account_id, accountId)];
  if (yr) conditions.push(sql`EXTRACT(YEAR FROM ${gitlab_contributions.date}) = ${String(yr)}`);
  return getDb().select({ date: gitlab_contributions.date, count: gitlab_contributions.count })
    .from(gitlab_contributions).where(and(...conditions)).orderBy(gitlab_contributions.date);
}

export async function upsertGitlabProject(project: { account_id: number; project_id: number; name: string; path_with_namespace: string; description: string | null; language: string | null; stars: number; forks: number; open_issues: number; topics: string; homepage: string | null; is_fork: number; visibility: string; created_at: string | null; updated_at: string | null; last_activity_at: string | null }) {
  await getDb().insert(gitlab_projects).values({ ...project, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [gitlab_projects.account_id, gitlab_projects.project_id],
    set: { stars: project.stars, forks: project.forks, open_issues: project.open_issues, topics: project.topics, language: project.language, description: project.description, visibility: project.visibility, updated_at: project.updated_at, last_activity_at: project.last_activity_at },
  });
}

export async function setPinnedGitlabProjects(accountId: number, projectIds: number[]) {
  const db = getDb();
  await db.update(gitlab_projects).set({ pinned: 0 }).where(eq(gitlab_projects.account_id, accountId));
  if (projectIds.length > 0) {
    await db.update(gitlab_projects).set({ pinned: 1 })
      .where(and(eq(gitlab_projects.account_id, accountId), sql`project_id IN ${sql.join(projectIds, sql`, `)}`));
  }
}

export async function insertGitlabStats(stats: { account_id: number; public_projects: number; followers: number; following: number }) {
  await getDb().insert(gitlab_stats).values({ ...stats, recorded_at: sql`NOW()` });
}

export async function upsertGitlabContribution(c: { account_id: number; date: string; count: number }) {
  await getDb().insert(gitlab_contributions).values({ ...c, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [gitlab_contributions.account_id, gitlab_contributions.date],
    set: { count: c.count },
  });
}

export async function upsertGitlabContributions(accountId: number, contributions: { date: string; count: number }[]) {
  if (contributions.length === 0) return;
  await getDb().insert(gitlab_contributions).values(
    contributions.map(c => ({ ...c, account_id: accountId, fetched_at: sql`NOW()` })),
  ).onConflictDoUpdate({
    target: [gitlab_contributions.account_id, gitlab_contributions.date],
    set: { count: sql.raw("excluded.count") },
  });
}

export async function upsertGitlabProjectSnapshot(s: { account_id: number; project_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  await getDb().insert(gitlab_project_snapshots).values(s).onConflictDoUpdate({
    target: [gitlab_project_snapshots.account_id, gitlab_project_snapshots.project_id, gitlab_project_snapshots.snapshot_date],
    set: { stars: s.stars, forks: s.forks, open_issues: s.open_issues },
  });
}

export async function getGitlabProjectSnapshots(accountId: number, projectId: number) {
  return getDb().select({
    stars: gitlab_project_snapshots.stars, forks: gitlab_project_snapshots.forks,
    open_issues: gitlab_project_snapshots.open_issues, date: gitlab_project_snapshots.snapshot_date,
  }).from(gitlab_project_snapshots)
    .where(and(eq(gitlab_project_snapshots.account_id, accountId), eq(gitlab_project_snapshots.project_id, projectId)))
    .orderBy(gitlab_project_snapshots.snapshot_date);
}

export async function upsertGitlabRelease(r: { account_id: number; project_id: number; release_tag: string; name: string | null; description: string | null; released_at: string | null; created_at: string | null }) {
  await getDb().insert(gitlab_releases).values({ ...r, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [gitlab_releases.account_id, gitlab_releases.project_id, gitlab_releases.release_tag],
    set: { name: r.name, description: r.description, released_at: r.released_at, created_at: r.created_at },
  });
}

export async function getGitlabReleases(accountId: number, projectId: number) {
  const all = await getDb().select().from(gitlab_releases)
    .where(and(eq(gitlab_releases.account_id, accountId), eq(gitlab_releases.project_id, projectId)));
  const latest = new Map<string, typeof all[0]>();
  for (const r of all) {
    if (!latest.has(r.release_tag) || r.id > latest.get(r.release_tag)!.id) {
      latest.set(r.release_tag, r);
    }
  }
  return [...latest.values()].sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
}

export async function insertGitlabReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; file_type: string | null; url: string | null }) {
  await getDb().insert(gitlab_release_assets).values({
    release_id: a.release_db_id, name: a.name, download_count: a.download_count,
    size: a.size, file_type: a.file_type, url: a.url,
  });
}
