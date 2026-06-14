import { eq, and, desc, sql } from "drizzle-orm";
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
  return getDb().select({
    date: gitlab_stats.recorded_at, public_projects: gitlab_stats.public_projects,
    followers: gitlab_stats.followers, following: gitlab_stats.following,
  }).from(gitlab_stats).where(eq(gitlab_stats.account_id, accountId)).orderBy(gitlab_stats.recorded_at);
}

export async function getGitlabContributions(accountId: number, yr?: number) {
  const conditions: any[] = [eq(gitlab_contributions.account_id, accountId)];
  if (yr) conditions.push(sql`EXTRACT(YEAR FROM ${gitlab_contributions.date}) = ${String(yr)}`);
  return getDb().select({ date: gitlab_contributions.date, count: gitlab_contributions.count })
    .from(gitlab_contributions).where(and(...conditions)).orderBy(gitlab_contributions.date);
}

export async function upsertGitlabProject(project: any) {
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

export async function insertGitlabStats(stats: any) {
  await getDb().insert(gitlab_stats).values({ ...stats, recorded_at: sql`NOW()` });
}

export async function upsertGitlabContribution(c: any) {
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

export async function upsertGitlabProjectSnapshot(s: any) {
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

export async function upsertGitlabRelease(r: any) {
  await getDb().insert(gitlab_releases).values({ ...r, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: [gitlab_releases.account_id, gitlab_releases.project_id, gitlab_releases.release_tag],
    set: { name: r.name, description: r.description, released_at: r.released_at, created_at: r.created_at },
  });
}

export async function getGitlabReleases(accountId: number, projectId: number) {
  return getDb().select().from(gitlab_releases)
    .where(and(eq(gitlab_releases.account_id, accountId), eq(gitlab_releases.project_id, projectId)))
    .orderBy(desc(gitlab_releases.released_at));
}

export async function insertGitlabReleaseAsset(a: any) {
  await getDb().insert(gitlab_release_assets).values({
    release_id: a.release_db_id, name: a.name, download_count: a.download_count,
    size: a.size, file_type: a.file_type, url: a.url,
  });
}
