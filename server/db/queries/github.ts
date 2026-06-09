// Re-exports from the old db.ts for backward compatibility.
// These stubs use raw SQLite through bun:sqlite and are not yet
// migrated to Drizzle ORM.

import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

function rawDb(): Database {
  const db = new Database(dbPath());
  db.exec("PRAGMA journal_mode = WAL");
  return db;
}

// ─── Types ────────────────────────────────────────────────────────

export interface GithubStatsRow { account_id: number; public_repos: number; public_gists: number; followers: number; following: number; recorded_at: string; }
export interface GithubRepoRow { id: number; account_id: number; repo_id: number; name: string; full_name: string; description: string | null; language: string | null; stars: number; forks: number; open_issues: number; topics: string; homepage: string | null; is_fork: number; pinned: number; created_at: string | null; updated_at: string | null; pushed_at: string | null; }
export interface GithubContributionRow { date: string; count: number; level: number; }

// ─── GitHub queries ────────────────────────────────────────────────

export function getGithubOverview(accountId: number) {
  const db = rawDb();
  const latest = db.query("SELECT * FROM github_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as GithubStatsRow | undefined;
  const allRepos = db.query("SELECT * FROM github_repos WHERE account_id = ? ORDER BY stars DESC").all(accountId) as GithubRepoRow[];
  const pinnedRepos = allRepos.filter(r => r.pinned);
  const repos = pinnedRepos.length > 0 ? pinnedRepos : allRepos;
  const totalStars = allRepos.reduce((s, r) => s + r.stars, 0);
  const totalForks = allRepos.reduce((s, r) => s + r.forks, 0);
  const languages = allRepos.filter(r => r.language).reduce((acc: Record<string, number>, r) => { acc[r.language!] = (acc[r.language!] || 0) + 1; return acc; }, {});
  const topRepos = [...allRepos].sort((a, b) => b.stars - a.stars).slice(0, 10);
  db.close();
  return { stats: latest, repos, allRepos, totalStars, totalForks, totalRepos: allRepos.length, languages, topRepos };
}

export function getGithubStatsTimeline(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT recorded_at as date, public_repos, followers, following FROM github_stats WHERE account_id = ? ORDER BY recorded_at ASC").all(accountId) as { date: string; public_repos: number; followers: number; following: number }[];
  db.close(); return r;
}

export function getGithubContributions(accountId: number, year?: number) {
  const db = rawDb();
  const r = year
    ? db.query("SELECT date, count, level FROM github_contributions WHERE account_id = ? AND strftime('%Y', date) = ? ORDER BY date ASC").all(accountId, String(year)) as GithubContributionRow[]
    : db.query("SELECT date, count, level FROM github_contributions WHERE account_id = ? ORDER BY date ASC").all(accountId) as GithubContributionRow[];
  db.close(); return r;
}

export function upsertGithubRepo(repo: Omit<GithubRepoRow, "id" | "fetched_at" | "pinned">) {
  const db = rawDb();
  db.query(`INSERT INTO github_repos (account_id,repo_id,name,full_name,description,language,stars,forks,open_issues,topics,homepage,is_fork,created_at,updated_at,pushed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues,topics=excluded.topics,language=excluded.language,description=excluded.description,pushed_at=excluded.pushed_at,updated_at=excluded.updated_at`).run(repo.account_id, repo.repo_id, repo.name, repo.full_name, repo.description, repo.language, repo.stars, repo.forks, repo.open_issues, repo.topics, repo.homepage, repo.is_fork, repo.created_at, repo.updated_at, repo.pushed_at);
  db.close();
}

export function setPinnedRepos(accountId: number, repoIds: number[]) {
  const db = rawDb();
  db.query("UPDATE github_repos SET pinned = 0 WHERE account_id = ?").run(accountId);
  if (repoIds.length > 0) {
    const placeholders = repoIds.map(() => "?").join(",");
    db.query(`UPDATE github_repos SET pinned = 1 WHERE account_id = ? AND repo_id IN (${placeholders})`).run(accountId, ...repoIds);
  }
  db.close();
}

export function insertGithubStats(stats: Omit<GithubStatsRow, "recorded_at">) {
  const db = rawDb();
  db.query("INSERT INTO github_stats (account_id, public_repos, public_gists, followers, following) VALUES(?,?,?,?,?)").run(stats.account_id, stats.public_repos, stats.public_gists, stats.followers, stats.following);
  db.close();
}

export function upsertGithubContribution(c: { account_id: number; date: string; count: number; level: number }) {
  const db = rawDb();
  db.query("INSERT INTO github_contributions (account_id, date, count, level) VALUES(?,?,?,?) ON CONFLICT(account_id,date) DO UPDATE SET count=excluded.count, level=excluded.level").run(c.account_id, c.date, c.count, c.level);
  db.close();
}

export function upsertGithubRepoSnapshot(s: { account_id: number; repo_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  const db = rawDb();
  db.query(`INSERT INTO github_repo_snapshots (account_id,repo_id,stars,forks,open_issues,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,snapshot_date) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues`).run(s.account_id, s.repo_id, s.stars, s.forks, s.open_issues, s.snapshot_date);
  db.close();
}

export function getGithubRepoSnapshots(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT stars, forks, open_issues, snapshot_date as date FROM github_repo_snapshots WHERE account_id = ? AND repo_id = ? ORDER BY snapshot_date ASC").all(accountId, repoId) as { stars: number; forks: number; open_issues: number; date: string }[];
  db.close(); return r;
}

export function upsertGithubTrafficClones(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  const db = rawDb();
  db.query(`INSERT INTO github_traffic_clones (account_id,repo_id,date,count,uniques) VALUES(?,?,?,?,?) ON CONFLICT(account_id,repo_id,date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.date, t.count, t.uniques);
  db.close();
}

export function getGithubTrafficClones(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT date, count, uniques FROM github_traffic_clones WHERE account_id = ? AND repo_id = ? ORDER BY date ASC").all(accountId, repoId) as { date: string; count: number; uniques: number }[];
  db.close(); return r;
}

export function upsertGithubTrafficViews(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  const db = rawDb();
  db.query(`INSERT INTO github_traffic_views (account_id,repo_id,date,count,uniques) VALUES(?,?,?,?,?) ON CONFLICT(account_id,repo_id,date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.date, t.count, t.uniques);
  db.close();
}

export function getGithubTrafficViews(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT date, count, uniques FROM github_traffic_views WHERE account_id = ? AND repo_id = ? ORDER BY date ASC").all(accountId, repoId) as { date: string; count: number; uniques: number }[];
  db.close(); return r;
}

export function upsertGithubReferrer(t: { account_id: number; repo_id: number; referrer: string; count: number; uniques: number; snapshot_date: string }) {
  const db = rawDb();
  db.query(`INSERT INTO github_referrers (account_id,repo_id,referrer,count,uniques,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,referrer,snapshot_date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.referrer, t.count, t.uniques, t.snapshot_date);
  db.close();
}

export function getGithubReferrers(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT snapshot_date, referrer, count, uniques FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY referrer ORDER BY snapshot_date DESC) as rn FROM github_referrers WHERE account_id = ? AND repo_id = ?) WHERE rn = 1 ORDER BY count DESC").all(accountId, repoId) as { snapshot_date: string; referrer: string; count: number; uniques: number }[];
  db.close(); return r;
}

export function getGithubReferrerHistory(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT snapshot_date, referrer, count, uniques FROM github_referrers WHERE account_id = ? AND repo_id = ? ORDER BY referrer, snapshot_date ASC").all(accountId, repoId) as { snapshot_date: string; referrer: string; count: number; uniques: number }[];
  db.close(); return r;
}

export function upsertGithubPath(t: { account_id: number; repo_id: number; path: string; title: string | null; count: number; uniques: number; snapshot_date: string }) {
  const db = rawDb();
  db.query(`INSERT INTO github_paths (account_id,repo_id,path,title,count,uniques,snapshot_date) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,path,snapshot_date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques,title=excluded.title`).run(t.account_id, t.repo_id, t.path, t.title, t.count, t.uniques, t.snapshot_date);
  db.close();
}

export function getGithubPaths(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT snapshot_date, path, title, count, uniques FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY path ORDER BY snapshot_date DESC) as rn FROM github_paths WHERE account_id = ? AND repo_id = ?) WHERE rn = 1 ORDER BY count DESC").all(accountId, repoId) as { snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[];
  db.close(); return r;
}

export function getGithubPathHistory(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT snapshot_date, path, title, count, uniques FROM github_paths WHERE account_id = ? AND repo_id = ? ORDER BY path, snapshot_date ASC").all(accountId, repoId) as { snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[];
  db.close(); return r;
}

export function upsertGithubRelease(r: { account_id: number; repo_id: number; release_id: number; tag_name: string | null; name: string | null; body: string | null; prerelease: number; published_at: string | null; html_url: string | null; total_downloads: number }) {
  const db = rawDb();
  db.query(`INSERT INTO github_releases (account_id,repo_id,release_id,tag_name,name,body,prerelease,published_at,html_url,total_downloads) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,release_id) DO UPDATE SET tag_name=excluded.tag_name,name=excluded.name,body=excluded.body,prerelease=excluded.prerelease,published_at=excluded.published_at,html_url=excluded.html_url,total_downloads=excluded.total_downloads`).run(r.account_id, r.repo_id, r.release_id, r.tag_name, r.name, r.body, r.prerelease, r.published_at, r.html_url, r.total_downloads);
  db.close();
}

export function getGithubReleases(accountId: number, repoId: number) {
  const db = rawDb();
  const r = db.query("SELECT * FROM github_releases WHERE account_id = ? AND repo_id = ? ORDER BY published_at DESC").all(accountId, repoId) as any[];
  db.close(); return r;
}

export function insertGithubReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; content_type: string | null; browser_download_url: string | null }) {
  const db = rawDb();
  db.query("DELETE FROM github_release_assets WHERE release_id = ?").run(a.release_db_id);
  db.query("INSERT INTO github_release_assets (release_id,name,download_count,size,content_type,browser_download_url) VALUES(?,?,?,?,?,?)").run(a.release_db_id, a.name, a.download_count, a.size, a.content_type, a.browser_download_url);
  db.close();
}
