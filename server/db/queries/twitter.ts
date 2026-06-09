// Twitter query stubs — delegates to raw SQL for full query compatibility
// Drizzle schemas defined; full Drizzle query migration in next iteration

import { encrypt } from "../../crypto";
import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

export interface TweetRow {
  id: string; account_id: number; full_text: string; created_at: string;
  favorite_count: number; retweet_count: number; reply_count: number;
  view_count: number; bookmark_count: number; is_quote: number;
  is_reply: number; is_retweet: number; media_urls: string;
  urls: string; hashtags: string; mentions: string; lang: string;
}

export interface UserStatsRow {
  account_id: number; followers_count: number; following_count: number;
  tweet_count: number; listed_count: number; recorded_at: string;
}

export interface DailyStatsRow {
  date: string; tweets_count: number; total_likes: number;
  total_retweets: number; total_replies: number; total_views: number;
  total_bookmarks: number;
}

// Raw DB fallback for complex queries — Drizzle's SQL builder can express these,
// but for stability during migration we keep the raw SQL patterns
function rawDb() {
  const db = new Database(dbPath());
  db.exec("PRAGMA journal_mode = WAL");
  return db;
}

export function getOverviewStats(accountIds?: number[]) {
  const db = rawDb();
  const whereClause = accountIds && accountIds.length > 0 ? `WHERE account_id IN (${accountIds.join(",")})` : "";
  const tweetStats = db.query(`
    SELECT COUNT(*) as total_tweets, COALESCE(SUM(favorite_count), 0) as total_likes,
    COALESCE(SUM(retweet_count), 0) as total_retweets, COALESCE(SUM(reply_count), 0) as total_replies,
    COALESCE(SUM(view_count), 0) as total_views, COALESCE(SUM(bookmark_count), 0) as total_bookmarks
    FROM tweets ${whereClause}`).get() as any;
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = db.query(`SELECT COALESCE(SUM(favorite_count), 0) as today_likes,
    COALESCE(SUM(retweet_count), 0) as today_retweets, COUNT(*) as today_tweets
    FROM tweets WHERE date(created_at) = ? ${accountIds?.length ? `AND account_id IN (${accountIds.join(",")})` : ""}`).get(today) as any;
  const latestStatsRows = db.query(`SELECT u1.account_id, u1.followers_count, u1.following_count, u1.tweet_count
    FROM user_stats u1 INNER JOIN (SELECT account_id, MAX(recorded_at) as max_recorded FROM user_stats GROUP BY account_id) u2
    ON u1.account_id = u2.account_id AND u1.recorded_at = u2.max_recorded
    ${accountIds?.length ? `WHERE u1.account_id IN (${accountIds.join(",")})` : ""}`).all() as UserStatsRow[];
  const followersCount = latestStatsRows.reduce((s, r) => s + r.followers_count, 0);
  const followingCount = latestStatsRows.reduce((s, r) => s + r.following_count, 0);
  const userTweetCount = latestStatsRows.reduce((s, r) => s + r.tweet_count, 0);
  db.close();
  return { ...tweetStats, avgEngagement: tweetStats.total_tweets > 0
    ? ((tweetStats.total_likes + tweetStats.total_retweets + tweetStats.total_replies) / tweetStats.total_tweets).toFixed(1) : "0",
    followersCount, followingCount, userTweetCount,
    todayLikes: todayStats?.today_likes ?? 0, todayRetweets: todayStats?.today_retweets ?? 0, todayTweets: todayStats?.today_tweets ?? 0 };
}

export function getTweets(page: number, limit: number, sort: string, order: string, search?: string, accountIds?: number[]) {
  const db = rawDb();
  const offset = (page - 1) * limit;
  const conditions: string[] = []; const params: any[] = [];
  if (search) { conditions.push("full_text LIKE ?"); params.push(`%${search}%`); }
  if (accountIds?.length) conditions.push(`account_id IN (${accountIds.join(",")})`);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const allowedSorts = ["created_at", "favorite_count", "retweet_count", "reply_count", "view_count"];
  const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "ASC" : "DESC";
  const total = db.query(`SELECT COUNT(*) as count FROM tweets ${whereClause}`).get(...params) as any;
  const rows = db.query(`SELECT * FROM tweets ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, limit, offset) as TweetRow[];
  db.close();
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getTweetById(id: string) {
  const db = rawDb();
  const r = db.query("SELECT * FROM tweets WHERE id = ?").get(id) as TweetRow | undefined;
  db.close();
  return r;
}

export function getTimelineStats(months: number, accountIds?: number[]) {
  const db = rawDb();
  const since = new Date(); since.setMonth(since.getMonth() - months);
  const w = accountIds?.length ? `WHERE created_at >= ? AND account_id IN (${accountIds.join(",")})` : "WHERE created_at >= ?";
  const dailyTweets = db.query(`SELECT date(created_at) as date, COUNT(*) as tweets_count, COALESCE(SUM(favorite_count),0) as total_likes, COALESCE(SUM(retweet_count),0) as total_retweets, COALESCE(SUM(reply_count),0) as total_replies, COALESCE(SUM(view_count),0) as total_views FROM tweets ${w} GROUP BY date(created_at) ORDER BY date ASC`).all(since.toISOString()) as DailyStatsRow[];
  const fw = accountIds?.length ? `WHERE recorded_at >= ? AND account_id IN (${accountIds.join(",")})` : "WHERE recorded_at >= ?";
  const followerGrowth = db.query(`SELECT recorded_at as date, followers_count, following_count, tweet_count FROM user_stats ${fw} ORDER BY recorded_at ASC`).all(since.toISOString()) as UserStatsRow[];
  db.close();
  return { dailyTweets, followerGrowth };
}

export function getTopTweets(metric: string, limit: number, accountIds?: number[]) {
  const db = rawDb();
  const allowed = ["favorite_count", "retweet_count", "reply_count", "view_count", "bookmark_count"];
  const col = allowed.includes(metric) ? metric : "favorite_count";
  const w = accountIds?.length ? `WHERE account_id IN (${accountIds.join(",")})` : "";
  const rows = db.query(`SELECT * FROM tweets ${w} ORDER BY ${col} DESC LIMIT ?`).all(limit) as TweetRow[];
  db.close();
  return rows;
}

export function getCalendarData(year: number, accountIds?: number[]) {
  const db = rawDb();
  const w = accountIds?.length ? `WHERE strftime('%Y', created_at) = ? AND account_id IN (${accountIds.join(",")})` : "WHERE strftime('%Y', created_at) = ?";
  const rows = db.query(`SELECT date(created_at) as date, COUNT(*) as count FROM tweets ${w} GROUP BY date(created_at) ORDER BY date ASC`).all(String(year)) as { date: string; count: number }[];
  db.close();
  return rows;
}

export function upsertTweet(tweet: Omit<TweetRow, "fetched_at">) {
  const db = rawDb();
  // `getUserTweetsAndReplies` always returns 0 for engagement fields. Use
  // MAX(existing, incoming) so a zero-valued update doesn't clobber real data.
  db.query(`INSERT INTO tweets (id,account_id,full_text,created_at,favorite_count,retweet_count,reply_count,view_count,bookmark_count,is_quote,is_reply,is_retweet,media_urls,urls,hashtags,mentions,lang) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET favorite_count=MAX(favorite_count, excluded.favorite_count),retweet_count=MAX(retweet_count, excluded.retweet_count),reply_count=MAX(reply_count, excluded.reply_count),view_count=MAX(view_count, excluded.view_count),bookmark_count=MAX(bookmark_count, excluded.bookmark_count)`).run(tweet.id, tweet.account_id, tweet.full_text, tweet.created_at, tweet.favorite_count, tweet.retweet_count, tweet.reply_count, tweet.view_count, tweet.bookmark_count, tweet.is_quote, tweet.is_reply, tweet.is_retweet, tweet.media_urls, tweet.urls, tweet.hashtags, tweet.mentions, tweet.lang);
  db.close();
}

export function insertUserStats(stats: Omit<UserStatsRow, "recorded_at">) {
  const db = rawDb();
  db.query(`INSERT INTO user_stats (account_id, followers_count, following_count, tweet_count, listed_count) VALUES(?,?,?,?,?)`).run(stats.account_id, stats.followers_count, stats.following_count, stats.tweet_count, stats.listed_count);
  db.close();
}

export function getLatestUserStats(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT * FROM user_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as UserStatsRow | undefined;
  db.close();
  return r;
}
