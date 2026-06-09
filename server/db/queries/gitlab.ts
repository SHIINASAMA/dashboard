// GitLab queries — raw SQLite stubs (Drizzle migration pending)

import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

function rawDb(): Database {
  const db = new Database(dbPath());
  db.exec("PRAGMA journal_mode = WAL");
  return db;
}

export interface GitlabStatsRow { account_id: number; public_projects: number; followers: number; following: number; recorded_at: string; }
export interface GitlabProjectRow { id: number; account_id: number; project_id: number; name: string; path_with_namespace: string; description: string | null; language: string | null; stars: number; forks: number; open_issues: number; topics: string; homepage: string | null; is_fork: number; pinned: number; visibility: string; created_at: string | null; updated_at: string | null; last_activity_at: string | null; }

export function getGitlabOverview(accountId: number) {
  const db = rawDb();
  const latest = db.query("SELECT * FROM gitlab_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as GitlabStatsRow | undefined;
  const allProjects = db.query("SELECT * FROM gitlab_projects WHERE account_id = ? ORDER BY stars DESC").all(accountId) as GitlabProjectRow[];
  const pinnedProjects = allProjects.filter(r => r.pinned);
  const projects = pinnedProjects.length > 0 ? pinnedProjects : allProjects;
  const totalStars = allProjects.reduce((s, r) => s + r.stars, 0);
  const totalForks = allProjects.reduce((s, r) => s + r.forks, 0);
  const languages = allProjects.filter(r => r.language).reduce((acc: Record<string, number>, r) => { acc[r.language!] = (acc[r.language!] || 0) + 1; return acc; }, {});
  const topProjects = [...allProjects].sort((a, b) => b.stars - a.stars).slice(0, 10);
  db.close();
  return { stats: latest, projects, allProjects, totalStars, totalForks, totalProjects: allProjects.length, languages, topProjects };
}

export function getGitlabStatsTimeline(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT recorded_at as date, public_projects, followers, following FROM gitlab_stats WHERE account_id = ? ORDER BY recorded_at ASC").all(accountId) as { date: string; public_projects: number; followers: number; following: number }[];
  db.close(); return r;
}

export function getGitlabContributions(accountId: number, year?: number) {
  const db = rawDb();
  const r = year
    ? db.query("SELECT date, count FROM gitlab_contributions WHERE account_id = ? AND strftime('%Y', date) = ? ORDER BY date ASC").all(accountId, String(year)) as { date: string; count: number }[]
    : db.query("SELECT date, count FROM gitlab_contributions WHERE account_id = ? ORDER BY date ASC").all(accountId) as { date: string; count: number }[];
  db.close(); return r;
}

export function upsertGitlabProject(project: Omit<GitlabProjectRow, "id" | "fetched_at" | "pinned">) {
  const db = rawDb();
  db.query(`INSERT INTO gitlab_projects (account_id,project_id,name,path_with_namespace,description,language,stars,forks,open_issues,topics,homepage,is_fork,visibility,created_at,updated_at,last_activity_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,project_id) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues,topics=excluded.topics,language=excluded.language,description=excluded.description,visibility=excluded.visibility,updated_at=excluded.updated_at,last_activity_at=excluded.last_activity_at`).run(project.account_id, project.project_id, project.name, project.path_with_namespace, project.description, project.language, project.stars, project.forks, project.open_issues, project.topics, project.homepage, project.is_fork, project.visibility, project.created_at, project.updated_at, project.last_activity_at);
  db.close();
}

export function setPinnedGitlabProjects(accountId: number, projectIds: number[]) {
  const db = rawDb();
  db.query("UPDATE gitlab_projects SET pinned = 0 WHERE account_id = ?").run(accountId);
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => "?").join(",");
    db.query(`UPDATE gitlab_projects SET pinned = 1 WHERE account_id = ? AND project_id IN (${placeholders})`).run(accountId, ...projectIds);
  }
  db.close();
}

export function insertGitlabStats(stats: Omit<GitlabStatsRow, "recorded_at">) {
  const db = rawDb();
  db.query("INSERT INTO gitlab_stats (account_id, public_projects, followers, following) VALUES(?,?,?,?)").run(stats.account_id, stats.public_projects, stats.followers, stats.following);
  db.close();
}

export function upsertGitlabContribution(c: { account_id: number; date: string; count: number }) {
  const db = rawDb();
  db.query("INSERT INTO gitlab_contributions (account_id, date, count) VALUES(?,?,?) ON CONFLICT(account_id,date) DO UPDATE SET count=excluded.count").run(c.account_id, c.date, c.count);
  db.close();
}

export function upsertGitlabProjectSnapshot(s: { account_id: number; project_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  const db = rawDb();
  db.query(`INSERT INTO gitlab_project_snapshots (account_id,project_id,stars,forks,open_issues,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,project_id,snapshot_date) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues`).run(s.account_id, s.project_id, s.stars, s.forks, s.open_issues, s.snapshot_date);
  db.close();
}

export function getGitlabProjectSnapshots(accountId: number, projectId: number) {
  const db = rawDb();
  const r = db.query("SELECT stars, forks, open_issues, snapshot_date as date FROM gitlab_project_snapshots WHERE account_id = ? AND project_id = ? ORDER BY snapshot_date ASC").all(accountId, projectId) as { stars: number; forks: number; open_issues: number; date: string }[];
  db.close(); return r;
}

export function upsertGitlabRelease(r: { account_id: number; project_id: number; release_tag: string; name: string | null; description: string | null; released_at: string | null; created_at: string | null }) {
  const db = rawDb();
  db.query(`INSERT INTO gitlab_releases (account_id,project_id,release_tag,name,description,released_at,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,project_id,release_tag) DO UPDATE SET name=excluded.name,description=excluded.description,released_at=excluded.released_at,created_at=excluded.created_at`).run(r.account_id, r.project_id, r.release_tag, r.name, r.description, r.released_at, r.created_at);
  db.close();
}

export function getGitlabReleases(accountId: number, projectId: number) {
  const db = rawDb();
  const r = db.query("SELECT * FROM gitlab_releases WHERE account_id = ? AND project_id = ? ORDER BY released_at DESC").all(accountId, projectId) as any[];
  db.close(); return r;
}

export function insertGitlabReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; file_type: string | null; url: string | null }) {
  const db = rawDb();
  db.query("DELETE FROM gitlab_release_assets WHERE release_id = ?").run(a.release_db_id);
  db.query("INSERT INTO gitlab_release_assets (release_id,name,download_count,size,file_type,url) VALUES(?,?,?,?,?,?)").run(a.release_db_id, a.name, a.download_count, a.size, a.file_type, a.url);
  db.close();
}
