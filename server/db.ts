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
  user_id: string;
  auth_token: string;
  fetch_interval: number;
  is_active: number;
  last_fetched_at: string | null;
  error_message: string | null;
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
    "SELECT id, screen_name, user_id, fetch_interval, is_active, last_fetched_at, error_message, created_at, updated_at FROM accounts ORDER BY created_at DESC"
  ).all() as AccountPublic[];
}

export function getActiveAccounts(): AccountRow[] {
  return getDb().query("SELECT * FROM accounts WHERE is_active = 1").all() as AccountRow[];
}

export function getAccountById(id: number): AccountRow | undefined {
  return getDb().query("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
}

export function createAccount(screenName: string, authToken: string, fetchInterval: number): AccountRow {
  const db = getDb();
  db.query(`
    INSERT INTO accounts (screen_name, auth_token, fetch_interval)
    VALUES (?, ?, ?)
  `).run(screenName, authToken, fetchInterval);
  const row = db.query("SELECT * FROM accounts WHERE id = last_insert_rowid()").get() as AccountRow;
  return row;
}

export function updateAccount(id: number, updates: Partial<Pick<AccountRow, "screen_name" | "auth_token" | "fetch_interval" | "is_active" | "user_id" | "last_fetched_at" | "error_message">>) {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: any[] = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }
  params.push(id);
  getDb().query(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export function deleteAccount(id: number) {
  const db = getDb();
  db.query("DELETE FROM tweets WHERE account_id = ?").run(id);
  db.query("DELETE FROM user_stats WHERE account_id = ?").run(id);
  db.query("DELETE FROM accounts WHERE id = ?").run(id);
}

// ─── Tweets ─────────────────────────────────────────────────────

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
      FROM user_stats
      GROUP BY account_id
    ) u2 ON u1.account_id = u2.account_id AND u1.recorded_at = u2.max_recorded
    ${accountIds && accountIds.length > 0 ? `WHERE u1.account_id IN (${accountIds.join(",")})` : ""}
  `).all() as UserStatsRow[];

  const followersCount = latestStatsRows.reduce((sum, r) => sum + r.followers_count, 0);
  const followingCount = latestStatsRows.reduce((sum, r) => sum + r.following_count, 0);
  const userTweetCount = latestStatsRows.reduce((sum, r) => sum + r.tweet_count, 0);

  const avgEngagement = tweetStats.total_tweets > 0
    ? ((tweetStats.total_likes + tweetStats.total_retweets + tweetStats.total_replies) / tweetStats.total_tweets).toFixed(1)
    : "0";

  return {
    ...tweetStats,
    avgEngagement,
    followersCount,
    followingCount,
    userTweetCount,
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
  if (search) {
    conditions.push("full_text LIKE ?");
    params.push(`%${search}%`);
  }
  if (accountIds && accountIds.length > 0) {
    conditions.push(`account_id IN (${accountIds.join(",")})`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const allowedSorts = ["created_at", "favorite_count", "retweet_count", "reply_count", "view_count"];
  const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  const total = db.query(`SELECT COUNT(*) as count FROM tweets ${whereClause}`).get(...params) as any;

  const rows = db.query(`
    SELECT * FROM tweets ${whereClause}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as TweetRow[];

  return {
    data: rows,
    total: total.count,
    page,
    limit,
    totalPages: Math.ceil(total.count / limit),
  };
}

export function getTweetById(id: string) {
  return getDb().query("SELECT * FROM tweets WHERE id = ?").get(id) as TweetRow | undefined;
}

export function getTimelineStats(months: number, accountIds?: number[]) {
  const db = getDb();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const whereClause = accountIds && accountIds.length > 0
    ? `WHERE created_at >= ? AND account_id IN (${accountIds.join(",")})`
    : "WHERE created_at >= ?";

  const dailyTweets = db.query(`
    SELECT
      date(created_at) as date,
      COUNT(*) as tweets_count,
      COALESCE(SUM(favorite_count), 0) as total_likes,
      COALESCE(SUM(retweet_count), 0) as total_retweets,
      COALESCE(SUM(reply_count), 0) as total_replies,
      COALESCE(SUM(view_count), 0) as total_views
    FROM tweets ${whereClause}
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(since.toISOString()) as DailyStatsRow[];

  const followerGrowth = db.query(`
    SELECT recorded_at as date, followers_count, following_count, tweet_count
    FROM user_stats
    WHERE recorded_at >= ? ${accountIds && accountIds.length > 0 ? `AND account_id IN (${accountIds.join(",")})` : ""}
    ORDER BY recorded_at ASC
  `).all(since.toISOString()) as UserStatsRow[];

  return { dailyTweets, followerGrowth };
}

export function getTopTweets(metric: string, limit: number, accountIds?: number[]) {
  const db = getDb();
  const allowedMetrics = ["favorite_count", "retweet_count", "reply_count", "view_count", "bookmark_count"];
  const metricCol = allowedMetrics.includes(metric) ? metric : "favorite_count";
  const whereClause = accountIds && accountIds.length > 0 ? `WHERE account_id IN (${accountIds.join(",")})` : "";

  return db.query(`
    SELECT * FROM tweets ${whereClause} ORDER BY ${metricCol} DESC LIMIT ?
  `).all(limit) as TweetRow[];
}

export function getCalendarData(year: number, accountIds?: number[]) {
  const db = getDb();
  const whereClause = accountIds && accountIds.length > 0
    ? `WHERE strftime('%Y', created_at) = ? AND account_id IN (${accountIds.join(",")})`
    : "WHERE strftime('%Y', created_at) = ?";

  return db.query(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tweets ${whereClause}
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(String(year)) as { date: string; count: number }[];
}

export function upsertTweet(tweet: Omit<TweetRow, "fetched_at">) {
  getDb().query(`
    INSERT INTO tweets (id, account_id, full_text, created_at, favorite_count, retweet_count,
      reply_count, view_count, bookmark_count, is_quote, is_reply, is_retweet,
      media_urls, urls, hashtags, mentions, lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      favorite_count = excluded.favorite_count,
      retweet_count = excluded.retweet_count,
      reply_count = excluded.reply_count,
      view_count = excluded.view_count,
      bookmark_count = excluded.bookmark_count
  `).run(
    tweet.id, tweet.account_id, tweet.full_text, tweet.created_at, tweet.favorite_count,
    tweet.retweet_count, tweet.reply_count, tweet.view_count, tweet.bookmark_count,
    tweet.is_quote, tweet.is_reply, tweet.is_retweet,
    tweet.media_urls, tweet.urls, tweet.hashtags, tweet.mentions, tweet.lang
  );
}

export function insertUserStats(stats: Omit<UserStatsRow, "recorded_at">) {
  getDb().query(`
    INSERT INTO user_stats (account_id, followers_count, following_count, tweet_count, listed_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(stats.account_id, stats.followers_count, stats.following_count, stats.tweet_count, stats.listed_count);
}

export function getLatestUserStats(accountId: number) {
  return getDb().query(`
    SELECT * FROM user_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1
  `).get(accountId) as UserStatsRow | undefined;
}
