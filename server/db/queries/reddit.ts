// Reddit queries — raw SQLite stubs (Drizzle migration pending)

import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

function rawDb(): Database {
  const db = new Database(dbPath());
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export interface RedditStatsRow { account_id: number; post_karma: number; comment_karma: number; recorded_at: string; }
export interface RedditPostRow { id: string; account_id: number; title: string; selftext: string; subreddit: string; score: number; upvote_ratio: number; num_comments: number; permalink: string; url: string; is_self: number; created_utc: number; }
export interface RedditCommentRow { id: string; account_id: number; body: string; subreddit: string; score: number; link_id: string; parent_id: string | null; depth: number; permalink: string; created_utc: number; is_submitter: number; }

export function insertRedditStats(stats: Omit<RedditStatsRow, "recorded_at">) {
  const db = rawDb();
  db.query("INSERT INTO reddit_stats (account_id, post_karma, comment_karma) VALUES(?,?,?)").run(stats.account_id, stats.post_karma, stats.comment_karma);
  db.close();
}

export function getRedditStatsTimeline(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT recorded_at as date, post_karma, comment_karma FROM reddit_stats WHERE account_id = ? ORDER BY recorded_at ASC").all(accountId) as { date: string; post_karma: number; comment_karma: number }[];
  db.close(); return r;
}

export function upsertRedditPost(post: Omit<RedditPostRow, "fetched_at">) {
  const db = rawDb();
  db.query(`INSERT INTO reddit_posts (id,account_id,title,selftext,subreddit,score,upvote_ratio,num_comments,permalink,url,is_self,created_utc) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score,upvote_ratio=excluded.upvote_ratio,num_comments=excluded.num_comments`).run(post.id, post.account_id, post.title, post.selftext, post.subreddit, post.score, post.upvote_ratio, post.num_comments, post.permalink, post.url, post.is_self, post.created_utc);
  db.close();
}

export function upsertRedditComment(comment: Omit<RedditCommentRow, "fetched_at">) {
  const db = rawDb();
  db.query(`INSERT INTO reddit_comments (id,account_id,body,subreddit,score,link_id,parent_id,depth,permalink,created_utc,is_submitter) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score`).run(comment.id, comment.account_id, comment.body, comment.subreddit, comment.score, comment.link_id, comment.parent_id, comment.depth, comment.permalink, comment.created_utc, comment.is_submitter);
  db.close();
}

export function getRedditPosts(accountId: number, page: number, limit: number, sort: string = "score") {
  const db = rawDb();
  const offset = (page - 1) * limit;
  const allowed = ["score", "num_comments", "created_utc"];
  const col = allowed.includes(sort) ? sort : "score";
  const total = db.query("SELECT count(*) as count FROM reddit_posts WHERE account_id = ?").get(accountId) as any;
  const rows = db.query(`SELECT * FROM reddit_posts WHERE account_id = ? ORDER BY ${col} DESC LIMIT ? OFFSET ?`).all(accountId, limit, offset) as RedditPostRow[];
  db.close();
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getRedditComments(accountId: number, page: number, limit: number) {
  const db = rawDb();
  const offset = (page - 1) * limit;
  const total = db.query("SELECT count(*) as count FROM reddit_comments WHERE account_id = ?").get(accountId) as any;
  const rows = db.query("SELECT * FROM reddit_comments WHERE account_id = ? ORDER BY created_utc DESC LIMIT ? OFFSET ?").all(accountId, limit, offset) as RedditCommentRow[];
  db.close();
  return { data: rows, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export function getRedditOverview(accountId: number) {
  const db = rawDb();
  const latest = db.query("SELECT * FROM reddit_stats WHERE account_id = ? ORDER BY recorded_at DESC LIMIT 1").get(accountId) as RedditStatsRow | undefined;
  const totalPosts = (db.query("SELECT count(*) as c FROM reddit_posts WHERE account_id = ?").get(accountId) as any)?.c ?? 0;
  const totalComments = (db.query("SELECT count(*) as c FROM reddit_comments WHERE account_id = ?").get(accountId) as any)?.c ?? 0;
  const totalScore = (db.query("SELECT COALESCE(SUM(score), 0) as s FROM reddit_posts WHERE account_id = ?").get(accountId) as any)?.s ?? 0;
  const topPosts = db.query("SELECT id, title, subreddit, score, num_comments, upvote_ratio, permalink, created_utc FROM reddit_posts WHERE account_id = ? ORDER BY score DESC LIMIT 10").all(accountId) as RedditPostRow[];
  db.close();
  return { stats: latest, totalPosts, totalComments, totalScore, topPosts };
}

export function getRedditDailyActivity(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT date(created_utc, 'unixepoch') as date, COUNT(*) as count FROM reddit_posts WHERE account_id = ? GROUP BY date ORDER BY date ASC").all(accountId) as { date: string; count: number }[];
  db.close(); return r;
}

export function getRedditSubredditDistribution(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT subreddit, COUNT(*) as count FROM (SELECT subreddit FROM reddit_posts WHERE account_id = ? UNION ALL SELECT subreddit FROM reddit_comments WHERE account_id = ?) GROUP BY subreddit ORDER BY count DESC LIMIT 10").all(accountId, accountId) as { subreddit: string; count: number }[];
  db.close(); return r;
}

export function getRedditDailyCommentActivity(accountId: number) {
  const db = rawDb();
  const r = db.query("SELECT date(created_utc, 'unixepoch') as date, COUNT(*) as count FROM reddit_comments WHERE account_id = ? GROUP BY date ORDER BY date ASC").all(accountId) as { date: string; count: number }[];
  db.close(); return r;
}
