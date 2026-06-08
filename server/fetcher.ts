import type { AccountRow } from "./db";
import { upsertTweet, insertUserStats, updateAccount } from "./db";
import { _xClient } from "../scripts/utils";
import { get } from "lodash";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiCall<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err.name === "ResponseError" && err.response?.status === 429;
      if (is429 && i < retries - 1) {
        const wait = (i + 1) * 5_000;
        console.log(`[Fetcher] Rate limited, retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

export async function fetchAccount(account: AccountRow) {
  console.log(`[Fetcher] Fetching @${account.screen_name}...`);

  try {
    const client = await _xClient(account.auth_token);
    await sleep(1000);

    // 1. Resolve user ID and get stats from the same call
    let userId = account.user_id;
    let legacy: any;

    if (userId) {
      const resp = await apiCall(() => client.getUserApi().getUserByScreenName({ screenName: account.screen_name }));
      const userData = resp.data as any;
      legacy = userData.user?.legacy || {};
    } else {
      const resp = await apiCall(() => client.getUserApi().getUserByScreenName({ screenName: account.screen_name }));
      const userData = resp.data as any;
      legacy = userData.user?.legacy || {};
      userId = userData.user?.restId || userData.raw?.restId || "";
      if (userId) {
        updateAccount(account.id, { user_id: userId });
      }
    }

    // Record stats
    if (legacy && Object.keys(legacy).length > 0) {
      insertUserStats({
        account_id: account.id,
        followers_count: legacy.followersCount || 0,
        following_count: legacy.friendsCount || 0,
        tweet_count: legacy.statusesCount || 0,
        listed_count: legacy.listedCount || 0,
      });
      console.log(`[Fetcher] @${account.screen_name}: stats recorded`);
    }

    if (!userId) {
      throw new Error(`Could not resolve user ID for @${account.screen_name}`);
    }

    // 2. Fetch tweets
    await sleep(2000);

    let cursor: string | undefined;
    let totalFetched = 0;
    const maxTweets = 800;
    const batchSize = 50;

    while (totalFetched < maxTweets) {
      const params: Record<string, unknown> = { userId, count: batchSize };
      if (cursor) params.cursor = cursor;

      const resp = await apiCall(() => client.getTweetApi().getUserTweets(params as any));
      const tweets = ((resp.data as any).data || []) as any[];

      if (tweets.length === 0) break;

      for (const tweet of tweets) {
        const legacyTweet = tweet.raw?.result?.legacy;
        if (!legacyTweet) continue;

        const tweetId = String(legacyTweet.idStr || "");
        if (!tweetId) continue;

        const mediaUrls = (get(legacyTweet, "extendedEntities.media", []) as any[])
          .filter((m: any) => m.type === "photo")
          .map((m: any) => m.mediaUrlHttps);
        const urls = (get(legacyTweet, "entities.urls", []) as any[])
          .map((u: any) => u.expandedUrl || u.url);
        const hashtags = (get(legacyTweet, "entities.hashtags", []) as any[])
          .map((h: any) => h.text);
        const mentions = (get(legacyTweet, "entities.user_mentions", []) as any[])
          .map((m: any) => m.screenName);

        upsertTweet({
          id: tweetId,
          account_id: account.id,
          full_text: legacyTweet.fullText || "",
          created_at: legacyTweet.createdAt || "",
          favorite_count: legacyTweet.favoriteCount || 0,
          retweet_count: legacyTweet.retweetCount || 0,
          reply_count: legacyTweet.replyCount || 0,
          view_count: legacyTweet.viewCount || 0,
          bookmark_count: legacyTweet.bookmarkCount || 0,
          is_quote: Boolean(legacyTweet.isQuoteStatus) ? 1 : 0,
          is_reply: Boolean(legacyTweet.inReplyToStatusIdStr) ? 1 : 0,
          is_retweet: (legacyTweet.fullText || "").startsWith("RT @") ? 1 : 0,
          media_urls: JSON.stringify(mediaUrls),
          urls: JSON.stringify(urls),
          hashtags: JSON.stringify(hashtags),
          mentions: JSON.stringify(mentions),
          lang: legacyTweet.lang || "",
        });
      }

      totalFetched += tweets.length;
      const cursorObj = (resp.data as any).cursor;
      cursor = cursorObj?.bottom?.value;
      if (!cursor) break;

      console.log(`[Fetcher] @${account.screen_name}: ${totalFetched} tweets...`);
      await sleep(2000);
    }

    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: null,
    });

    console.log(`[Fetcher] @${account.screen_name}: done (${totalFetched} tweets)`);
    return totalFetched;
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error(`[Fetcher] @${account.screen_name} error:`, msg);

    if (err.name === "ResponseError" && err.response) {
      try {
        const status = err.response.status;
        const body = await err.response.text().catch(() => "");
        console.error(`[Fetcher] HTTP ${status}:`, body.slice(0, 500));
      } catch (_) {}
    }

    updateAccount(account.id, { error_message: msg });
    return 0;
  }
}
