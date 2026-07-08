// @ts-nocheck — Drizzle ORM types are complex
import { eq, desc, sql, count, type SQL } from "drizzle-orm";
import { getDb } from "../db/connection";
import { reddit_stats, reddit_posts, reddit_comments } from "@/db/schema";

export async function insertRedditStats(stats: { account_id: number; post_karma: number; comment_karma: number }) {
  await getDb().insert(reddit_stats).values({ ...stats, recorded_at: sql`NOW()` });
}

export async function getRedditTimeline(accountId: number) {
  const { rows } = await getDb().execute<{
    date: string;
    post_karma: number;
    comment_karma: number;
  }>(sql`SELECT DISTINCT ON (SUBSTRING(${reddit_stats.recorded_at}, 1, 10))
    SUBSTRING(${reddit_stats.recorded_at}, 1, 10) AS date,
    ${reddit_stats.post_karma},
    ${reddit_stats.comment_karma}
  FROM ${reddit_stats}
  WHERE ${reddit_stats.account_id} = ${accountId}
  ORDER BY SUBSTRING(${reddit_stats.recorded_at}, 1, 10), ${reddit_stats.recorded_at} DESC`);
  return rows;
}

export async function upsertRedditPost(post: { id: string; account_id: number; title: string; selftext: string; subreddit: string; score: number; upvote_ratio: number; num_comments: number; permalink: string; url: string; is_self: number; created_utc: number }) {
  await getDb().insert(reddit_posts).values({ ...post, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: reddit_posts.id,
    set: { score: post.score, upvote_ratio: post.upvote_ratio, num_comments: post.num_comments },
  });
}

export async function upsertRedditComment(comment: { id: string; account_id: number; body: string; subreddit: string; score: number; link_id: string; parent_id: string | null; depth: number; permalink: string; created_utc: number; is_submitter: number }) {
  await getDb().insert(reddit_comments).values({ ...comment, fetched_at: sql`NOW()` }).onConflictDoUpdate({
    target: reddit_comments.id,
    set: { score: comment.score },
  });
}

export async function getRedditPosts(accountId: number, page: number, limit: number, sort = "score") {
  const offset = (page - 1) * limit;
  const allowed: Record<string, SQL<unknown>> = { score: reddit_posts.score, num_comments: reddit_posts.num_comments, created_utc: reddit_posts.created_utc };
  const sortCol = allowed[sort] || reddit_posts.score;
  const [total] = await getDb().select({ count: count() }).from(reddit_posts).where(eq(reddit_posts.account_id, accountId));
  const data = await getDb().select().from(reddit_posts)
    .where(eq(reddit_posts.account_id, accountId)).orderBy(desc(sortCol)).limit(limit).offset(offset);
  return { data, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export async function getRedditComments(accountId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [total] = await getDb().select({ count: count() }).from(reddit_comments).where(eq(reddit_comments.account_id, accountId));
  const data = await getDb().select().from(reddit_comments)
    .where(eq(reddit_comments.account_id, accountId)).orderBy(desc(reddit_comments.created_utc)).limit(limit).offset(offset);
  return { data, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export async function getRedditOverview(accountId: number) {
  const [latest] = await getDb().select().from(reddit_stats)
    .where(eq(reddit_stats.account_id, accountId)).orderBy(desc(reddit_stats.recorded_at)).limit(1);
  const [postCount] = await getDb().select({ count: count() }).from(reddit_posts).where(eq(reddit_posts.account_id, accountId));
  const [commentCount] = await getDb().select({ count: count() }).from(reddit_comments).where(eq(reddit_comments.account_id, accountId));
  const [scoreSum] = await getDb().select({ s: sql<number>`COALESCE(SUM(${reddit_posts.score}), 0)` }).from(reddit_posts).where(eq(reddit_posts.account_id, accountId));
  const topPosts = await getDb().select({
    id: reddit_posts.id, title: reddit_posts.title, subreddit: reddit_posts.subreddit,
    score: reddit_posts.score, num_comments: reddit_posts.num_comments,
    upvote_ratio: reddit_posts.upvote_ratio, permalink: reddit_posts.permalink,
    created_utc: reddit_posts.created_utc,
  }).from(reddit_posts).where(eq(reddit_posts.account_id, accountId)).orderBy(desc(reddit_posts.score)).limit(10);
  return { stats: latest || undefined, totalPosts: postCount.count, totalComments: commentCount.count, totalScore: scoreSum.s, topPosts };
}

export async function getRedditDailyActivity(accountId: number) {
  return getDb().select({
    date: sql`TO_TIMESTAMP(${reddit_posts.created_utc})::date`.as("date"),
    count: count(),
  }).from(reddit_posts).where(eq(reddit_posts.account_id, accountId))
    .groupBy(sql`TO_TIMESTAMP(${reddit_posts.created_utc})::date`)
    .orderBy(sql`TO_TIMESTAMP(${reddit_posts.created_utc})::date`);
}

export async function getRedditDailyCommentActivity(accountId: number) {
  return getDb().select({
    date: sql`TO_TIMESTAMP(${reddit_comments.created_utc})::date`.as("date"),
    count: count(),
  }).from(reddit_comments).where(eq(reddit_comments.account_id, accountId))
    .groupBy(sql`TO_TIMESTAMP(${reddit_comments.created_utc})::date`)
    .orderBy(sql`TO_TIMESTAMP(${reddit_comments.created_utc})::date`);
}

export async function getRedditSubredditDistribution(accountId: number) {
  const posts = await getDb().select({ subreddit: reddit_posts.subreddit, count: count() })
    .from(reddit_posts).where(eq(reddit_posts.account_id, accountId)).groupBy(reddit_posts.subreddit);
  const comments = await getDb().select({ subreddit: reddit_comments.subreddit, count: count() })
    .from(reddit_comments).where(eq(reddit_comments.account_id, accountId)).groupBy(reddit_comments.subreddit);
  const combined = new Map<string, number>();
  for (const p of posts) combined.set(p.subreddit, (combined.get(p.subreddit) || 0) + p.count);
  for (const c of comments) combined.set(c.subreddit, (combined.get(c.subreddit) || 0) + c.count);
  return [...combined.entries()].map(([subreddit, count]) => ({ subreddit, count })).sort((a, b) => b.count - a.count).slice(0, 10);
}
