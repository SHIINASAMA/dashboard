import { Database } from "bun:sqlite";
import { initSchema } from "../db/schema";
import { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const DB_PATH = join(__dirname, "..", "data", "dashboard.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

// ─── Account types ──────────────────────────────────────────────

export interface AccountRow {
  id: number;
  screen_name: string;
  platform: string;
  user_id: string | null;
  auth_token: string;
  fetch_interval: number;
  is_active: number;
  last_fetched_at: string | null;
  error_message: string | null;
  instance_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountPublic = Omit<AccountRow, "auth_token">;

// ─── Data types ─────────────────────────────────────────────────

export interface TweetRow {
  id: string;
  account_id: number;
  full_text: string;
  created_at: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  view_count: number;
  bookmark_count: number;
  is_quote: number;
  is_reply: number;
  is_retweet: number;
  media_urls: string;
  urls: string;
  hashtags: string;
  mentions: string;
  lang: string;
}

export interface UserStatsRow {
  account_id: number;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  recorded_at: string;
}

export interface GithubStatsRow {
  account_id: number;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  recorded_at: string;
}

export interface GithubRepoRow {
  id: number;
  account_id: number;
  repo_id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string;
  homepage: string | null;
  is_fork: number;
  pinned: number;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
}

export interface GithubContributionRow {
  date: string;
  count: number;
  level: number;
}

export interface DailyStatsRow {
  date: string;
  tweets_count: number;
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  total_views: number;
  total_bookmarks: number;
}

// ─── Account CRUD ───────────────────────────────────────────────

export function getAccounts(): AccountPublic[] {
  return getDb().query(
    "SELECT id, screen_name, platform, user_id, instance_url, fetch_interval, is_active, last_fetched_at, error_message, created_at, updated_at FROM accounts ORDER BY created_at DESC"
  ).all() as AccountPublic[];
}

export function getActiveAccounts(): AccountRow[] {
  return getDb().query("SELECT * FROM accounts WHERE is_active = 1").all() as AccountRow[];
}

export function getAccountById(id: number): AccountRow | undefined {
  return getDb().query("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
}

export function createAccount(
  screenName: string,
  authToken: string,
  fetchInterval: number,
  platform: string = "twitter",
  instanceUrl: string | null = null
): AccountRow {
  const db = getDb();
  db.query(`
    INSERT INTO accounts (screen_name, auth_token, fetch_interval, platform, instance_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(screenName, authToken, fetchInterval, platform, instanceUrl);
  return db.query("SELECT * FROM accounts WHERE id = last_insert_rowid()").get() as AccountRow;
}

export function updateAccount(id: number, updates: Partial<AccountRow>) {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: (string | number | null)[] = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      params.push(val as any);
    }
  }
  params.push(id);
  getDb().query(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export function deleteAccount(id: number) {
  const db = getDb();
  db.query("DELETE FROM tweets WHERE account_id = ?").run(id);
  db.query("DELETE FROM user_stats WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_release_assets WHERE release_id IN (SELECT id FROM github_releases WHERE account_id = ?)").run(id);
  db.query("DELETE FROM github_releases WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_referrers WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_paths WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_traffic_clones WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_traffic_views WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_repo_snapshots WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_repos WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_contributions WHERE account_id = ?").run(id);
  db.query("DELETE FROM github_stats WHERE account_id = ?").run(id);
  db.query("DELETE FROM gitlab_release_assets WHERE release_id IN (SELECT id FROM gitlab_releases WHERE account_id = ?)").run(id);
  db.query("DELETE FROM gitlab_releases WHERE account_id = ?").run(id);
  db.query("DELETE FROM gitlab_project_snapshots WHERE account_id = ?").run(id);
  db.query("DELETE FROM gitlab_projects WHERE account_id = ?").run(id);
  db.query("DELETE FROM gitlab_stats WHERE account_id = ?").run(id);
  db.query("DELETE FROM reddit_comments WHERE account_id = ?").run(id);
  db.query("DELETE FROM reddit_posts WHERE account_id = ?").run(id);
  db.query("DELETE FROM reddit_stats WHERE account_id = ?").run(id);
  db.query("DELETE FROM accounts WHERE id = ?").run(id);
}

// ─── Twitter queries ────────────────────────────────────────────

export function getOverviewStats(accountIds?: number[]) {
  const db = getDb();
  const whereClause = accountIds && accountIds.length > 0 ? `WHERE account_id IN (${accountIds.join(",")})` : "";

  const tweetStats = db.query(`
    SELECT
      COUNT(*) as total_tweets,
      COALESCE(SUM(favorite_count), 0) as total_likes,
      COALESCE(SUM(retweet_count), 0) as total_retweets,
      COALESCE(SUM(reply_count), 0) as total_replies,
      COALESCE(SUM(view_count), 0) as total_views,
      COALESCE(SUM(bookmark_count), 0) as total_bookmarks
    FROM tweets ${whereClause}
  `).get() as any;

  const today = new Date().toISOString().slice(0, 10);
  const todayStats = db.query(`
    SELECT
      COALESCE(SUM(favorite_count), 0) as today_likes,
      COALESCE(SUM(retweet_count), 0) as today_retweets,
      COUNT(*) as today_tweets
    FROM tweets WHERE date(created_at) = ? ${accountIds && accountIds.length > 0 ? `AND account_id IN (${accountIds.join(",")})` : ""}
  `).get(today) as any;

  const latestStatsRows = db.query(`
    SELECT u1.account_id, u1.followers_count, u1.following_count, u1.tweet_count
    FROM user_stats u1
    INNER JOIN (
      SELECT account_id, MAX(recorded_at) as max_recorded
      FROM user_stats GROUP BY account_id
    ) u2 ON u1.account_id = u2.account_id AND u1.recorded_at = u2.max_recorded
    ${accountIds && accountIds.length > 0 ? `WHERE u1.account_id IN (${accountIds.join(",")})` : ""}
  `).all() as UserStatsRow[];

  const followersCount = latestStatsRows.reduce((s, r) => s + r.followers_count, 0);
  const followingCount = latestStatsRows.reduce((s, r) => s + r.following_count, 0);
  const userTweetCount = latestStatsRows.reduce((s, r) => s + r.tweet_count, 0);

  return {
    ...tweetStats,
    avgEngagement: tweetStats.total_tweets > 0
      ? ((tweetStats.total_likes + tweetStats.total_retweets + tweetStats.total_replies) / tweetStats.total_tweets).toFixed(1)
      : "0",
    followersCount, followingCount, userTweetCount,
    todayLikes: todayStats?.today_likes ?? 0,
    todayRetweets: todayStats?.today_retweets ?? 0,
    todayTweets: todayStats?.today_tweets ?? 0,
  };
}

export function getTweets(page: number, limit: number, sort: string, order: string, search?: string, accountIds?: number[]) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  if (search) { conditions.push("full_text LIKE ?"); params.push(`%${search}%`); }
  if (accountIds?.length) conditions.push(`account_id IN (${accountIds.join(",")})`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const allowedSorts = ["created_at", "favorite_count", "retweet_count", "reply_count", "view_count"];
  const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "ASC" : "DESC";
  const total = db.query(`SELECT COUNT(*) as count FROM tweets ${whereClause}`).get(...params) as any;
  const rows = db.query(`SELECT * FROM tweets ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, limit, offset) as TweetRow[];
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getTweetById(id: string) {
  return getDb().query("SELECT * FROM tweets WHERE id = ?").get(id) as TweetRow | undefined;
}

export function getTimelineStats(months: number, accountIds?: number[]) {
  const db = getDb();
  const since = new Date(); since.setMonth(since.getMonth() - months);
  const w = accountIds?.length ? `WHERE created_at >= ? AND account_id IN (${accountIds.join(",")})` : "WHERE created_at >= ?";
  const dailyTweets = db.query(`SELECT date(created_at) as date, COUNT(*) as tweets_count, COALESCE(SUM(favorite_count),0) as total_likes, COALESCE(SUM(retweet_count),0) as total_retweets, COALESCE(SUM(reply_count),0) as total_replies, COALESCE(SUM(view_count),0) as total_views FROM tweets ${w} GROUP BY date(created_at) ORDER BY date ASC`).all(since.toISOString()) as DailyStatsRow[];
  const fw = accountIds?.length ? `WHERE recorded_at >= ? AND account_id IN (${accountIds.join(",")})` : "WHERE recorded_at >= ?";
  const followerGrowth = db.query(`SELECT recorded_at as date, followers_count, following_count, tweet_count FROM user_stats ${fw} ORDER BY recorded_at ASC`).all(since.toISOString()) as UserStatsRow[];
  return { dailyTweets, followerGrowth };
}

export function getTopTweets(metric: string, limit: number, accountIds?: number[]) {
  const db = getDb();
  const allowed = ["favorite_count", "retweet_count", "reply_count", "view_count", "bookmark_count"];
  const col = allowed.includes(metric) ? metric : "favorite_count";
  const w = accountIds?.length ? `WHERE account_id IN (${accountIds.join(",")})` : "";
  return db.query(`SELECT * FROM tweets ${w} ORDER BY ${col} DESC LIMIT ?`).all(limit) as TweetRow[];
}

export function getCalendarData(year: number, accountIds?: number[]) {
  const db = getDb();
  const w = accountIds?.length ? `WHERE strftime('%Y', created_at) = ? AND account_id IN (${accountIds.join(",")})` : "WHERE strftime('%Y', created_at) = ?";
  return db.query(`SELECT date(created_at) as date, COUNT(*) as count FROM tweets ${w} GROUP BY date(created_at) ORDER BY date ASC`).all(String(year)) as { date: string; count: number }[];
}

export function upsertTweet(tweet: Omit<TweetRow, "fetched_at">) {
  getDb().query(`INSERT INTO tweets (id,account_id,full_text,created_at,favorite_count,retweet_count,reply_count,view_count,bookmark_count,is_quote,is_reply,is_retweet,media_urls,urls,hashtags,mentions,lang) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET favorite_count=excluded.favorite_count,retweet_count=excluded.retweet_count,reply_count=excluded.reply_count,view_count=excluded.view_count,bookmark_count=excluded.bookmark_count`).run(
    tweet.id, tweet.account_id, tweet.full_text, tweet.created_at, tweet.favorite_count, tweet.retweet_count, tweet.reply_count, tweet.view_count, tweet.bookmark_count, tweet.is_quote, tweet.is_reply, tweet.is_retweet, tweet.media_urls, tweet.urls, tweet.hashtags, tweet.mentions, tweet.lang);
}

export function insertUserStats(stats: Omit<UserStatsRow, "recorded_at">) {
  getDb().query(`INSERT INTO user_stats (account_id, followers_count, following_count, tweet_count, listed_count) VALUES(?,?,?,?,?)`).run(stats.account_id, stats.followers_count, stats.following_count, stats.tweet_count, stats.listed_count);
}

export function getLatestUserStats(accountId: number) {
  return getDb().query("SELECT * FROM user_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as UserStatsRow | undefined;
}

// ─── GitHub queries ──────────────────────────────────────────────

export function getGithubOverview(accountId: number) {
  const db = getDb();
  const latest = db.query("SELECT * FROM github_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as GithubStatsRow | undefined;
  const allRepos = db.query("SELECT * FROM github_repos WHERE account_id = ? ORDER BY stars DESC").all(accountId) as GithubRepoRow[];
  const pinnedRepos = allRepos.filter(r => r.pinned);
  const repos = pinnedRepos.length > 0 ? pinnedRepos : allRepos;
  const totalStars = allRepos.reduce((s, r) => s + r.stars, 0);
  const totalForks = allRepos.reduce((s, r) => s + r.forks, 0);
  const languages = allRepos.filter(r => r.language).reduce((acc: Record<string, number>, r) => {
    acc[r.language!] = (acc[r.language!] || 0) + 1;
    return acc;
  }, {});
  const topRepos = [...allRepos].sort((a, b) => b.stars - a.stars).slice(0, 10);
  return { stats: latest, repos, allRepos, totalStars, totalForks, totalRepos: allRepos.length, languages, topRepos };
}

export function getGithubStatsTimeline(accountId: number) {
  return getDb().query(
    "SELECT recorded_at as date, public_repos, followers, following FROM github_stats WHERE account_id = ? ORDER BY recorded_at ASC"
  ).all(accountId) as { date: string; public_repos: number; followers: number; following: number }[];
}

export function getGithubContributions(accountId: number, year?: number) {
  const db = getDb();
  if (year) {
    return db.query("SELECT date, count, level FROM github_contributions WHERE account_id = ? AND strftime('%Y', date) = ? ORDER BY date ASC").all(accountId, String(year)) as GithubContributionRow[];
  }
  return db.query("SELECT date, count, level FROM github_contributions WHERE account_id = ? ORDER BY date ASC").all(accountId) as GithubContributionRow[];
}

export function upsertGithubRepo(repo: Omit<GithubRepoRow, "id" | "fetched_at" | "pinned">) {
  getDb().query(`INSERT INTO github_repos (account_id,repo_id,name,full_name,description,language,stars,forks,open_issues,topics,homepage,is_fork,created_at,updated_at,pushed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues,topics=excluded.topics,language=excluded.language,description=excluded.description,pushed_at=excluded.pushed_at,updated_at=excluded.updated_at`).run(
    repo.account_id, repo.repo_id, repo.name, repo.full_name, repo.description, repo.language, repo.stars, repo.forks, repo.open_issues, repo.topics, repo.homepage, repo.is_fork, repo.created_at, repo.updated_at, repo.pushed_at);
}

export function setPinnedRepos(accountId: number, repoIds: number[]) {
  const db = getDb();
  const update = db.transaction(() => {
    db.query("UPDATE github_repos SET pinned = 0 WHERE account_id = ?").run(accountId);
    if (repoIds.length > 0) {
      const placeholders = repoIds.map(() => "?").join(",");
      db.query(`UPDATE github_repos SET pinned = 1 WHERE account_id = ? AND repo_id IN (${placeholders})`).run(accountId, ...repoIds);
    }
  });
  update();
}

export function insertGithubStats(stats: Omit<GithubStatsRow, "recorded_at">) {
  getDb().query("INSERT INTO github_stats (account_id, public_repos, public_gists, followers, following) VALUES(?,?,?,?,?)").run(stats.account_id, stats.public_repos, stats.public_gists, stats.followers, stats.following);
}

export function upsertGithubContribution(c: { account_id: number; date: string; count: number; level: number }) {
  getDb().query("INSERT INTO github_contributions (account_id, date, count, level) VALUES(?,?,?,?) ON CONFLICT(account_id,date) DO UPDATE SET count=excluded.count, level=excluded.level").run(c.account_id, c.date, c.count, c.level);
}

// ─── GitHub Repo Insights ──────────────────────────────────────────

export function upsertGithubRepoSnapshot(s: { account_id: number; repo_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  getDb().query(`INSERT INTO github_repo_snapshots (account_id,repo_id,stars,forks,open_issues,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,snapshot_date) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues`).run(
    s.account_id, s.repo_id, s.stars, s.forks, s.open_issues, s.snapshot_date);
}

export function getGithubRepoSnapshots(accountId: number, repoId: number) {
  return getDb().query("SELECT stars, forks, open_issues, snapshot_date as date FROM github_repo_snapshots WHERE account_id = ? AND repo_id = ? ORDER BY snapshot_date ASC").all(accountId, repoId) as { stars: number; forks: number; open_issues: number; date: string }[];
}

export function upsertGithubTrafficClones(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  getDb().query(`INSERT INTO github_traffic_clones (account_id,repo_id,date,count,uniques) VALUES(?,?,?,?,?) ON CONFLICT(account_id,repo_id,date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.date, t.count, t.uniques);
}

export function getGithubTrafficClones(accountId: number, repoId: number) {
  return getDb().query("SELECT date, count, uniques FROM github_traffic_clones WHERE account_id = ? AND repo_id = ? ORDER BY date ASC").all(accountId, repoId) as { date: string; count: number; uniques: number }[];
}

export function upsertGithubTrafficViews(t: { account_id: number; repo_id: number; date: string; count: number; uniques: number }) {
  getDb().query(`INSERT INTO github_traffic_views (account_id,repo_id,date,count,uniques) VALUES(?,?,?,?,?) ON CONFLICT(account_id,repo_id,date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.date, t.count, t.uniques);
}

export function getGithubTrafficViews(accountId: number, repoId: number) {
  return getDb().query("SELECT date, count, uniques FROM github_traffic_views WHERE account_id = ? AND repo_id = ? ORDER BY date ASC").all(accountId, repoId) as { date: string; count: number; uniques: number }[];
}

export function upsertGithubReferrer(t: { account_id: number; repo_id: number; referrer: string; count: number; uniques: number; snapshot_date: string }) {
  getDb().query(`INSERT INTO github_referrers (account_id,repo_id,referrer,count,uniques,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,referrer,snapshot_date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques`).run(t.account_id, t.repo_id, t.referrer, t.count, t.uniques, t.snapshot_date);
}

export function getGithubReferrers(accountId: number, repoId: number) {
  return getDb().query("SELECT snapshot_date, referrer, count, uniques FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY referrer ORDER BY snapshot_date DESC) as rn FROM github_referrers WHERE account_id = ? AND repo_id = ?) WHERE rn = 1 ORDER BY count DESC").all(accountId, repoId) as { snapshot_date: string; referrer: string; count: number; uniques: number }[];
}

export function getGithubReferrerHistory(accountId: number, repoId: number) {
  return getDb().query("SELECT snapshot_date, referrer, count, uniques FROM github_referrers WHERE account_id = ? AND repo_id = ? ORDER BY referrer, snapshot_date ASC").all(accountId, repoId) as { snapshot_date: string; referrer: string; count: number; uniques: number }[];
}

export function upsertGithubPath(t: { account_id: number; repo_id: number; path: string; title: string | null; count: number; uniques: number; snapshot_date: string }) {
  getDb().query(`INSERT INTO github_paths (account_id,repo_id,path,title,count,uniques,snapshot_date) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,path,snapshot_date) DO UPDATE SET count=excluded.count,uniques=excluded.uniques,title=excluded.title`).run(t.account_id, t.repo_id, t.path, t.title, t.count, t.uniques, t.snapshot_date);
}

export function getGithubPaths(accountId: number, repoId: number) {
  return getDb().query("SELECT snapshot_date, path, title, count, uniques FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY path ORDER BY snapshot_date DESC) as rn FROM github_paths WHERE account_id = ? AND repo_id = ?) WHERE rn = 1 ORDER BY count DESC").all(accountId, repoId) as { snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[];
}

export function getGithubPathHistory(accountId: number, repoId: number) {
  return getDb().query("SELECT snapshot_date, path, title, count, uniques FROM github_paths WHERE account_id = ? AND repo_id = ? ORDER BY path, snapshot_date ASC").all(accountId, repoId) as { snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[];
}

export function upsertGithubRelease(r: { account_id: number; repo_id: number; release_id: number; tag_name: string | null; name: string | null; body: string | null; prerelease: number; published_at: string | null; html_url: string | null; total_downloads: number }) {
  getDb().query(`INSERT INTO github_releases (account_id,repo_id,release_id,tag_name,name,body,prerelease,published_at,html_url,total_downloads) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,repo_id,release_id) DO UPDATE SET tag_name=excluded.tag_name,name=excluded.name,body=excluded.body,prerelease=excluded.prerelease,published_at=excluded.published_at,html_url=excluded.html_url,total_downloads=excluded.total_downloads`).run(
    r.account_id, r.repo_id, r.release_id, r.tag_name, r.name, r.body, r.prerelease, r.published_at, r.html_url, r.total_downloads);
}

export function getGithubReleases(accountId: number, repoId: number) {
  return getDb().query("SELECT * FROM github_releases WHERE account_id = ? AND repo_id = ? ORDER BY published_at DESC").all(accountId, repoId) as any[];
}

export function insertGithubReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; content_type: string | null; browser_download_url: string | null }) {
  getDb().query("DELETE FROM github_release_assets WHERE release_id = ?").run(a.release_db_id);
  getDb().query("INSERT INTO github_release_assets (release_id,name,download_count,size,content_type,browser_download_url) VALUES(?,?,?,?,?,?)").run(a.release_db_id, a.name, a.download_count, a.size, a.content_type, a.browser_download_url);
}

// ─── GitLab types ────────────────────────────────────────────────

export interface GitlabStatsRow {
  account_id: number;
  public_projects: number;
  followers: number;
  following: number;
  recorded_at: string;
}

export interface GitlabProjectRow {
  id: number;
  account_id: number;
  project_id: number;
  name: string;
  path_with_namespace: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string;
  homepage: string | null;
  is_fork: number;
  pinned: number;
  visibility: string;
  created_at: string | null;
  updated_at: string | null;
  last_activity_at: string | null;
}

// ─── GitLab queries ──────────────────────────────────────────────

export function getGitlabOverview(accountId: number) {
  const db = getDb();
  const latest = db.query("SELECT * FROM gitlab_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as GitlabStatsRow | undefined;
  const allProjects = db.query("SELECT * FROM gitlab_projects WHERE account_id = ? ORDER BY stars DESC").all(accountId) as GitlabProjectRow[];
  const pinnedProjects = allProjects.filter(r => r.pinned);
  const projects = pinnedProjects.length > 0 ? pinnedProjects : allProjects;
  const totalStars = allProjects.reduce((s, r) => s + r.stars, 0);
  const totalForks = allProjects.reduce((s, r) => s + r.forks, 0);
  const languages = allProjects.filter(r => r.language).reduce((acc: Record<string, number>, r) => {
    acc[r.language!] = (acc[r.language!] || 0) + 1;
    return acc;
  }, {});
  const topProjects = [...allProjects].sort((a, b) => b.stars - a.stars).slice(0, 10);
  return { stats: latest, projects, allProjects, totalStars, totalForks, totalProjects: allProjects.length, languages, topProjects };
}

export function getGitlabStatsTimeline(accountId: number) {
  return getDb().query(
    "SELECT recorded_at as date, public_projects, followers, following FROM gitlab_stats WHERE account_id = ? ORDER BY recorded_at ASC"
  ).all(accountId) as { date: string; public_projects: number; followers: number; following: number }[];
}

export function getGitlabContributions(accountId: number, year?: number) {
  const db = getDb();
  if (year) {
    return db.query("SELECT date, count FROM gitlab_contributions WHERE account_id = ? AND strftime('%Y', date) = ? ORDER BY date ASC").all(accountId, String(year)) as { date: string; count: number }[];
  }
  return db.query("SELECT date, count FROM gitlab_contributions WHERE account_id = ? ORDER BY date ASC").all(accountId) as { date: string; count: number }[];
}

export function upsertGitlabProject(project: Omit<GitlabProjectRow, "id" | "fetched_at" | "pinned">) {
  getDb().query(`INSERT INTO gitlab_projects (account_id,project_id,name,path_with_namespace,description,language,stars,forks,open_issues,topics,homepage,is_fork,visibility,created_at,updated_at,last_activity_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,project_id) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues,topics=excluded.topics,language=excluded.language,description=excluded.description,visibility=excluded.visibility,updated_at=excluded.updated_at,last_activity_at=excluded.last_activity_at`).run(
    project.account_id, project.project_id, project.name, project.path_with_namespace, project.description, project.language, project.stars, project.forks, project.open_issues, project.topics, project.homepage, project.is_fork, project.visibility, project.created_at, project.updated_at, project.last_activity_at);
}

export function setPinnedGitlabProjects(accountId: number, projectIds: number[]) {
  const db = getDb();
  const update = db.transaction(() => {
    db.query("UPDATE gitlab_projects SET pinned = 0 WHERE account_id = ?").run(accountId);
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",");
      db.query(`UPDATE gitlab_projects SET pinned = 1 WHERE account_id = ? AND project_id IN (${placeholders})`).run(accountId, ...projectIds);
    }
  });
  update();
}

export function insertGitlabStats(stats: Omit<GitlabStatsRow, "recorded_at">) {
  getDb().query("INSERT INTO gitlab_stats (account_id, public_projects, followers, following) VALUES(?,?,?,?)").run(stats.account_id, stats.public_projects, stats.followers, stats.following);
}

export function upsertGitlabContribution(c: { account_id: number; date: string; count: number }) {
  getDb().query("INSERT INTO gitlab_contributions (account_id, date, count) VALUES(?,?,?) ON CONFLICT(account_id,date) DO UPDATE SET count=excluded.count").run(c.account_id, c.date, c.count);
}

export function upsertGitlabProjectSnapshot(s: { account_id: number; project_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string }) {
  getDb().query(`INSERT INTO gitlab_project_snapshots (account_id,project_id,stars,forks,open_issues,snapshot_date) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id,project_id,snapshot_date) DO UPDATE SET stars=excluded.stars,forks=excluded.forks,open_issues=excluded.open_issues`).run(
    s.account_id, s.project_id, s.stars, s.forks, s.open_issues, s.snapshot_date);
}

export function getGitlabProjectSnapshots(accountId: number, projectId: number) {
  return getDb().query("SELECT stars, forks, open_issues, snapshot_date as date FROM gitlab_project_snapshots WHERE account_id = ? AND project_id = ? ORDER BY snapshot_date ASC").all(accountId, projectId) as { stars: number; forks: number; open_issues: number; date: string }[];
}

export function upsertGitlabRelease(r: { account_id: number; project_id: number; release_tag: string; name: string | null; description: string | null; released_at: string | null; created_at: string | null }) {
  getDb().query(`INSERT INTO gitlab_releases (account_id,project_id,release_tag,name,description,released_at,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,project_id,release_tag) DO UPDATE SET name=excluded.name,description=excluded.description,released_at=excluded.released_at,created_at=excluded.created_at`).run(
    r.account_id, r.project_id, r.release_tag, r.name, r.description, r.released_at, r.created_at);
}

export function getGitlabReleases(accountId: number, projectId: number) {
  return getDb().query("SELECT * FROM gitlab_releases WHERE account_id = ? AND project_id = ? ORDER BY released_at DESC").all(accountId, projectId) as any[];
}

export function insertGitlabReleaseAsset(a: { release_db_id: number; name: string; download_count: number; size: number; file_type: string | null; url: string | null }) {
  getDb().query("DELETE FROM gitlab_release_assets WHERE release_id = ?").run(a.release_db_id);
  getDb().query("INSERT INTO gitlab_release_assets (release_id,name,download_count,size,file_type,url) VALUES(?,?,?,?,?,?)").run(a.release_db_id, a.name, a.download_count, a.size, a.file_type, a.url);
}

// ─── Reddit types ───────────────────────────────────────────────

export interface RedditStatsRow {
  account_id: number;
  post_karma: number;
  comment_karma: number;
  recorded_at: string;
}

export interface RedditPostRow {
  id: string;
  account_id: number;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  permalink: string;
  url: string;
  is_self: number;
  created_utc: number;
}

export interface RedditCommentRow {
  id: string;
  account_id: number;
  body: string;
  subreddit: string;
  score: number;
  link_id: string;
  parent_id: string | null;
  depth: number;
  permalink: string;
  created_utc: number;
  is_submitter: number;
}

// ─── Reddit queries ─────────────────────────────────────────────

export function insertRedditStats(stats: Omit<RedditStatsRow, "recorded_at">) {
  getDb().query("INSERT INTO reddit_stats (account_id, post_karma, comment_karma) VALUES(?,?,?)").run(stats.account_id, stats.post_karma, stats.comment_karma);
}

export function getRedditStatsTimeline(accountId: number) {
  return getDb().query("SELECT recorded_at as date, post_karma, comment_karma FROM reddit_stats WHERE account_id = ? ORDER BY recorded_at ASC").all(accountId) as { date: string; post_karma: number; comment_karma: number }[];
}

export function upsertRedditPost(post: Omit<RedditPostRow, "fetched_at">) {
  getDb().query(`INSERT INTO reddit_posts (id,account_id,title,selftext,subreddit,score,upvote_ratio,num_comments,permalink,url,is_self,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score,upvote_ratio=excluded.upvote_ratio,num_comments=excluded.num_comments`).run(
    post.id, post.account_id, post.title, post.selftext, post.subreddit, post.score, post.upvote_ratio, post.num_comments, post.permalink, post.url, post.is_self, post.created_utc);
}

export function upsertRedditComment(comment: Omit<RedditCommentRow, "fetched_at">) {
  getDb().query(`INSERT INTO reddit_comments (id,account_id,body,subreddit,score,link_id,parent_id,depth,permalink,created_utc,is_submitter) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score`).run(
    comment.id, comment.account_id, comment.body, comment.subreddit, comment.score, comment.link_id, comment.parent_id, comment.depth, comment.permalink, comment.created_utc, comment.is_submitter);
}

export function getRedditPosts(accountId: number, page: number, limit: number, sort: string = "score") {
  const db = getDb();
  const offset = (page - 1) * limit;
  const allowed = ["score", "num_comments", "created_utc"];
  const col = allowed.includes(sort) ? sort : "score";
  const total = db.query("SELECT count(*) as count FROM reddit_posts WHERE account_id = ?").get(accountId) as any;
  const rows = db.query(`SELECT * FROM reddit_posts WHERE account_id = ? ORDER BY ${col} DESC LIMIT ? OFFSET ?`).all(accountId, limit, offset) as RedditPostRow[];
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getRedditComments(accountId: number, page: number, limit: number) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const total = db.query("SELECT count(*) as count FROM reddit_comments WHERE account_id = ?").get(accountId) as any;
  const rows = db.query("SELECT * FROM reddit_comments WHERE account_id = ? ORDER BY created_utc DESC LIMIT ? OFFSET ?").all(accountId, limit, offset) as RedditCommentRow[];
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getRedditOverview(accountId: number) {
  const db = getDb();
  const latest = db.query("SELECT * FROM reddit_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as RedditStatsRow | undefined;
  const totalPosts = (db.query("SELECT count(*) as c FROM reddit_posts WHERE account_id = ?").get(accountId) as any)?.c ?? 0;
  const totalComments = (db.query("SELECT count(*) as c FROM reddit_comments WHERE account_id = ?").get(accountId) as any)?.c ?? 0;
  const totalScore = (db.query("SELECT COALESCE(SUM(score), 0) as s FROM reddit_posts WHERE account_id = ?").get(accountId) as any)?.s ?? 0;
  const topPosts = db.query("SELECT id, title, subreddit, score, num_comments, upvote_ratio, permalink, created_utc FROM reddit_posts WHERE account_id = ? ORDER BY score DESC LIMIT 10").all(accountId) as RedditPostRow[];
  return { stats: latest, totalPosts, totalComments, totalScore, topPosts };
}
