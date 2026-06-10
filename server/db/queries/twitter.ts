import { eq, desc, sql, and, count, inArray, gte, like } from "drizzle-orm";
import { getDb } from "../connection";
import { tweets, user_stats } from "../../../db/schema";
import type { OverviewStats } from "../../../shared/types";

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

function hasIds(ids?: number[]): ids is number[] {
  return Array.isArray(ids) && ids.length > 0;
}
function isExplicitEmpty(ids?: number[]): boolean {
  return Array.isArray(ids) && ids.length === 0;
}

const EMPTY_OVERVIEW: OverviewStats = {
  tweet_count: 0, tweet_likes: 0, tweet_retweets: 0, tweet_views: 0,
  reply_count: 0, reply_likes: 0, reply_retweets: 0, reply_views: 0,
  followersCount: 0, followingCount: 0, userTweetCount: 0,
  todayLikes: 0, todayRetweets: 0, todayTweets: 0,
};

export async function getOverviewStats(accountIds?: number[]) {
  if (isExplicitEmpty(accountIds)) return { ...EMPTY_OVERVIEW };
  const db = getDb();
  const tweetFilter = hasIds(accountIds) ? inArray(tweets.account_id, accountIds) : undefined;

  // Tweet stats: own tweets only (not replies, not retweets)
  const tweetCond = and(
    eq(tweets.is_reply, 0), eq(tweets.is_retweet, 0),
    ...(tweetFilter ? [tweetFilter] : []),
  );
  const [tw] = await db.select({
    tweet_count: count(),
    tweet_likes: sql<number>`COALESCE(SUM(${tweets.favorite_count}), 0)`,
    tweet_retweets: sql<number>`COALESCE(SUM(${tweets.retweet_count}), 0)`,
    tweet_views: sql<number>`COALESCE(SUM(${tweets.view_count}), 0)`,
  }).from(tweets).where(tweetCond);

  // Reply stats
  const replyCond = and(
    eq(tweets.is_reply, 1),
    ...(tweetFilter ? [tweetFilter] : []),
  );
  const [rp] = await db.select({
    reply_count: count(),
    reply_likes: sql<number>`COALESCE(SUM(${tweets.favorite_count}), 0)`,
    reply_retweets: sql<number>`COALESCE(SUM(${tweets.retweet_count}), 0)`,
    reply_views: sql<number>`COALESCE(SUM(${tweets.view_count}), 0)`,
  }).from(tweets).where(replyCond);

  const today = new Date().toISOString().slice(0, 10);
  const todayCond = and(
    gte(tweets.created_at, today),
    ...(tweetFilter ? [tweetFilter] : []),
  );
  const [td] = await db.select({
    today_likes: sql<number>`COALESCE(SUM(${tweets.favorite_count}), 0)`,
    today_retweets: sql<number>`COALESCE(SUM(${tweets.retweet_count}), 0)`,
    today_tweets: count(),
  }).from(tweets).where(todayCond);

  const allStats = await db.select({
    account_id: user_stats.account_id,
    followers_count: user_stats.followers_count,
    following_count: user_stats.following_count,
    tweet_count: user_stats.tweet_count,
  }).from(user_stats)
    .where(hasIds(accountIds) ? inArray(user_stats.account_id, accountIds) : undefined)
    .orderBy(desc(user_stats.recorded_at));

  const latestMap = new Map<number, typeof allStats[0]>();
  for (const s of allStats) {
    if (!latestMap.has(s.account_id)) {
      latestMap.set(s.account_id, s);
    }
  }
  const latestStatsRows = [...latestMap.values()];
  const followersCount = latestStatsRows.reduce((s, r) => s + r.followers_count, 0);
  const followingCount = latestStatsRows.reduce((s, r) => s + r.following_count, 0);
  const userTweetCount = latestStatsRows.reduce((s, r) => s + r.tweet_count, 0);

  return {
    tweet_count: tw?.tweet_count ?? 0,
    tweet_likes: tw?.tweet_likes ?? 0,
    tweet_retweets: tw?.tweet_retweets ?? 0,
    tweet_views: tw?.tweet_views ?? 0,
    reply_count: rp?.reply_count ?? 0,
    reply_likes: rp?.reply_likes ?? 0,
    reply_retweets: rp?.reply_retweets ?? 0,
    reply_views: rp?.reply_views ?? 0,
    followersCount, followingCount, userTweetCount,
    todayLikes: Number(td?.today_likes ?? 0),
    todayRetweets: Number(td?.today_retweets ?? 0),
    todayTweets: Number(td?.today_tweets ?? 0),
  };
}

export async function getTweets(page: number, limit: number, sort: string, order: string, search?: string, accountIds?: number[], isReply?: number) {
  if (isExplicitEmpty(accountIds)) return { data: [], total: 0, page, limit, totalPages: 0 };
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (search) conditions.push(like(tweets.full_text, `%${search}%`));
  if (hasIds(accountIds)) conditions.push(inArray(tweets.account_id, accountIds));
  if (isReply !== undefined) conditions.push(eq(tweets.is_reply, isReply));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const allowedSorts: Record<string, any> = {
    created_at: tweets.created_at, favorite_count: tweets.favorite_count,
    retweet_count: tweets.retweet_count, reply_count: tweets.reply_count,
    view_count: tweets.view_count,
  };
  const sortCol = allowedSorts[sort] || tweets.created_at;
  const sortOrder = order === "asc" ? sortCol : desc(sortCol);
  const [total] = await db.select({ count: count() }).from(tweets).where(whereClause);
  const data = await db.select().from(tweets)
    .where(whereClause)
    .orderBy(sortOrder)
    .limit(limit).offset(offset) as TweetRow[];
  return { data, total: total.count, page, limit, totalPages: Math.ceil(total.count / limit) };
}

export async function getTweetById(id: string) {
  return getDb().select().from(tweets).where(eq(tweets.id, id)).get() as Promise<TweetRow | undefined>;
}

export async function getTimelineStats(months: number, accountIds?: number[]) {
  if (isExplicitEmpty(accountIds)) return { dailyTweets: [], followerGrowth: [] };
  const db = getDb();
  const since = new Date(); since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString();
  const tweetFilter = hasIds(accountIds) ? inArray(tweets.account_id, accountIds) : undefined;
  const statsFilter = hasIds(accountIds) ? inArray(user_stats.account_id, accountIds) : undefined;

  const dailyTweets = await db.select({
    date: sql`date(${tweets.created_at})`.as<string>(),
    tweets_count: count(),
    total_likes: sql<number>`COALESCE(SUM(${tweets.favorite_count}), 0)`,
    total_retweets: sql<number>`COALESCE(SUM(${tweets.retweet_count}), 0)`,
    total_replies: sql<number>`COALESCE(SUM(${tweets.reply_count}), 0)`,
    total_views: sql<number>`COALESCE(SUM(${tweets.view_count}), 0)`,
  }).from(tweets)
    .where(and(gte(tweets.created_at, sinceStr), tweetFilter))
    .groupBy(sql`date(${tweets.created_at})`)
    .orderBy(sql`date(${tweets.created_at})`);

  const followerGrowth = await db.select({
    date: user_stats.recorded_at,
    followers_count: user_stats.followers_count,
    following_count: user_stats.following_count,
    tweet_count: user_stats.tweet_count,
  }).from(user_stats)
    .where(and(gte(user_stats.recorded_at, sinceStr), statsFilter))
    .orderBy(user_stats.recorded_at) as UserStatsRow[];

  return { dailyTweets, followerGrowth };
}

export async function getTopTweets(metric: string, limit: number, accountIds?: number[]) {
  if (isExplicitEmpty(accountIds)) return [];
  const allowed: Record<string, any> = {
    favorite_count: tweets.favorite_count, retweet_count: tweets.retweet_count,
    reply_count: tweets.reply_count, view_count: tweets.view_count,
    bookmark_count: tweets.bookmark_count,
  };
  const col = allowed[metric] || tweets.favorite_count;
  const whereClause = hasIds(accountIds) ? inArray(tweets.account_id, accountIds) : undefined;
  return getDb().select().from(tweets)
    .where(whereClause)
    .orderBy(desc(col))
    .limit(limit) as Promise<TweetRow[]>;
}

export async function getCalendarData(year: number, accountIds?: number[]) {
  if (isExplicitEmpty(accountIds)) return [];
  const conditions: any[] = [sql`strftime('%Y', ${tweets.created_at}) = ${String(year)}`];
  if (hasIds(accountIds)) conditions.push(inArray(tweets.account_id, accountIds));
  return getDb().select({
    date: sql`date(${tweets.created_at})`.as<string>(),
    count: count(),
  }).from(tweets)
    .where(and(...conditions))
    .groupBy(sql`date(${tweets.created_at})`)
    .orderBy(sql`date(${tweets.created_at})`) as Promise<{ date: string; count: number }[]>;
}

export async function upsertTweet(tweet: Omit<TweetRow, "fetched_at">) {
  await getDb().insert(tweets).values({...tweet, fetched_at: sql`(datetime('now'))`}).onConflictDoUpdate({
    target: tweets.id,
    set: {
      favorite_count: tweet.favorite_count,
      retweet_count: tweet.retweet_count,
      reply_count: tweet.reply_count,
      view_count: tweet.view_count,
      bookmark_count: tweet.bookmark_count,
    },
  });
}

export async function insertUserStats(stats: Omit<UserStatsRow, "recorded_at">) {
  await getDb().insert(user_stats).values({...stats, recorded_at: sql`(datetime('now'))`});
}

export async function getLatestUserStats(accountId: number) {
  return getDb().select().from(user_stats)
    .where(eq(user_stats.account_id, accountId))
    .orderBy(desc(user_stats.recorded_at))
    .limit(1)
    .then(rows => rows[0]) as Promise<UserStatsRow | undefined>;
}

export async function updateTweetEngagement(
  tweetId: string,
  eng: { favorite_count: number; retweet_count: number; reply_count: number; view_count: number; bookmark_count: number }
) {
  await getDb().update(tweets)
    .set({
      favorite_count: eng.favorite_count,
      retweet_count: eng.retweet_count,
      reply_count: eng.reply_count,
      view_count: eng.view_count,
      bookmark_count: eng.bookmark_count,
    })
    .where(eq(tweets.id, tweetId));
}
