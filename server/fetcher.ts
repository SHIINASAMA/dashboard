import type { AccountRow } from "./db";
import { upsertTweet, insertUserStats, updateAccount, updateTweetEngagement } from "./db";
import { _xClient } from "../scripts/utils";
import { get } from "lodash";

function toISO(createdAt: string | undefined): string {
  if (!createdAt) return "";
  return new Date(createdAt).toISOString();
}

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

    // 1.5. Fetch pinned tweets (not returned by timeline endpoints)
    {
      const pinnedIds: string[] =
        (legacy.pinnedTweetIdsStr as string[]) || [];

      if (pinnedIds.length > 0) {
        console.log(
          `[Fetcher] @${account.screen_name}: fetching ${pinnedIds.length} pinned tweet(s)...`
        );
        await sleep(1000);
        for (const pid of pinnedIds) {
          try {
            await sleep(1000);
            const detailResp = await client
              .getTweetApi()
              .getTweetDetail({ focalTweetId: pid });
            const entries = ((detailResp.data as any).data || {}) as any;
            for (const key of Object.keys(entries)) {
              const entry = entries[key];
              const tweetResult = entry?.tweet || entry;
              const tlegacy = tweetResult?.legacy;
              if (tlegacy?.idStr === pid) {
                const views = tweetResult?.views || entry?.views;
                upsertTweet({
                  id: pid,
                  account_id: account.id,
                  full_text: tlegacy.fullText || "",
                  created_at: toISO(tlegacy.createdAt),
                  favorite_count: tlegacy.favoriteCount || 0,
                  retweet_count:
                    (tlegacy.retweetCount || 0) + (tlegacy.quoteCount || 0),
                  reply_count: tlegacy.replyCount || 0,
                  view_count:
                    views?.count
                      ? parseInt(String(views.count), 10) || 0
                      : 0,
                  bookmark_count: tlegacy.bookmarkCount || 0,
                  is_quote: Boolean(tlegacy.isQuoteStatus) ? 1 : 0,
                  is_reply: Boolean(tlegacy.inReplyToStatusIdStr) ? 1 : 0,
                  is_retweet: 0,
                });
                break;
              }
            }
          } catch (_) { /* Non-fatal */ }
        }
      }
    }

    // 2. Fetch tweets from both endpoints.
    //    getUserTweets returns the user's own tweets with real engagement;
    //    getUserTweetsAndReplies additionally returns replies to others.
    //    Both are needed for complete coverage.
    await sleep(2000);

    const maxTweets = 800;
    const batchSize = 50;
    const kaoruTweetIds = [];

    async function fetchFromEndpoint(
      label: string,
      apiFn: (params: any) => Promise<any>
    ) {
      let cursor: string | undefined;
      let totalFetched = 0;
      while (totalFetched < maxTweets) {
        const params: Record<string, unknown> = { userId, count: batchSize };
        if (cursor) params.cursor = cursor;

        const resp = await apiCall(() => apiFn(params));
        const tweets = ((resp.data as any).data || []) as any[];

        if (tweets.length === 0) break;

        for (const tweet of tweets) {
          const t = tweet.tweet;
          if (!t) continue;

          const legacyTweet = t.legacy;
          if (!legacyTweet) continue;

          // Skip tweets whose author differs from the account
          const tweetAuthorId = legacyTweet.userIdStr || "";
          if (tweetAuthorId && tweetAuthorId !== userId) continue;

          const tweetId = String(legacyTweet.idStr || "");
          if (!tweetId) continue;

          kaoruTweetIds.push(tweetId);

          const views = t.views;

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
            created_at: toISO(legacyTweet.createdAt),
            favorite_count: legacyTweet.favoriteCount || 0,
            retweet_count: (legacyTweet.retweetCount || 0) + (legacyTweet.quoteCount || 0),
            reply_count: legacyTweet.replyCount || 0,
            view_count: views?.count ? parseInt(String(views.count), 10) || 0 : 0,
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
        const rawData = resp.data as any;
        const cursorObj = rawData.cursor;
        cursor = cursorObj?.bottom?.value || cursorObj?.top?.value;
        if (!cursor) {
          console.log(`[Fetcher] @${account.screen_name}: ${label} no cursor after ${totalFetched} tweets`);
          break;
        }

        console.log(`[Fetcher] @${account.screen_name}: ${label} ${totalFetched} tweets...`);
        await sleep(2000);
      }
    }

    await fetchFromEndpoint("getUserTweets",
      (params: any) => client.getTweetApi().getUserTweets(params));
    await sleep(2000);
    await fetchFromEndpoint("getUserTweetsAndReplies",
      (params: any) => client.getTweetApi().getUserTweetsAndReplies(params));

    // 3. Merge real engagement via getTweetDetail (best-effort).
    //    getUserTweetsAndReplies returns 0 for engagement on author's own
    //    tweets, but getTweetDetail returns real counts. Process up to 30
    //    tweets per fetch to avoid excessive API calls.
    if (kaoruTweetIds.length > 0) {
      const maxDetail = kaoruTweetIds.length;
      const toProcess = kaoruTweetIds.slice(0, maxDetail);
      console.log(`[Fetcher] @${account.screen_name}: fetching engagement for ${toProcess.length}/${kaoruTweetIds.length} tweets...`);
      for (const tid of toProcess) {
        try {
          await sleep(1000);
          const detailResp = await client.getTweetApi().getTweetDetail({ focalTweetId: tid });
          const entries = ((detailResp.data as any).data || {});
          for (const key of Object.keys(entries)) {
            const entry = entries[key];
            const tweetResult = entry?.tweet || entry;
            const legacy = tweetResult?.legacy;
            if (legacy?.idStr === tid) {
              const views = tweetResult?.views || entry?.views;
              updateTweetEngagement(tid, {
                favorite_count: legacy.favoriteCount || 0,
                retweet_count: (legacy.retweetCount || 0) + (legacy.quoteCount || 0),
                reply_count: legacy.replyCount || 0,
                view_count: views?.count ? parseInt(String(views.count), 10) || 0 : 0,
                bookmark_count: legacy.bookmarkCount || 0,
              });
              break;
            }
          }
        } catch (e) {
          // Non-fatal
        }
      }
      console.log(`[Fetcher] @${account.screen_name}: engagement merge done`);
    }

    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: null,
    });

    console.log(`[Fetcher] @${account.screen_name}: done (${kaoruTweetIds.length} tweets processed)`);
    return kaoruTweetIds.length;
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
