/**
 * Test the new X fetcher algorithm against real API data.
 * Does NOT write to database — only prints what would be collected.
 *
 * Usage: bun run scripts/test-fetch-algorithm.ts
 */
import { _xClient } from "./utils";
import { getDb } from "../server/db/connection";
import { accounts } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt, initCrypto } from "../server/crypto";
import { loadOrGenerateKey } from "../server/config";

// Bootstrap
initCrypto(loadOrGenerateKey());

function decToken(cipher: string): string {
  try { return decrypt(cipher); } catch { return cipher; }
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
        console.warn(`  Rate limited, retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

function parseViews(views: any): number {
  if (!views) return 0;
  const c = views.count;
  if (c === undefined || c === null) return 0;
  return parseInt(String(c), 10) || 0;
}

// ── Main ───────────────────────────────────────────────────────────

console.log("=== Testing X Fetcher Algorithm ===\n");

const db = getDb();
const rows = await db.select().from(accounts)
  .where(and(eq(accounts.is_active, 1), eq(accounts.platform, "twitter"), isNull(accounts.deleted_at)));

if (rows.length === 0) {
  console.log("No active Twitter accounts found.");
  process.exit(0);
}

const account = rows[0];
const token = decToken(account.auth_token);
const screenName = account.screen_name;

console.log(`Testing with @${screenName} (id=${account.id})\n`);

const client = await _xClient(token);
await sleep(1000);

// ── Phase 1: User profile ──────────────────────────────────────
console.log("── Phase 1: User Profile ──");
const profileResp = await apiCall(() =>
  client.getUserApi().getUserByScreenName({ screenName }),
);
const userData = profileResp.data as any;
const legacy = userData.user?.legacy || {};
const userId = account.user_id || userData.user?.restId || userData.raw?.restId || "";

console.log(`  userId: ${userId}`);
console.log(`  followers: ${legacy.followersCount ?? 0}`);
console.log(`  following: ${legacy.friendsCount ?? 0}`);
console.log(`  tweets: ${legacy.statusesCount ?? 0}`);
const pinnedIds: string[] = (legacy.pinnedTweetIdsStr as string[]) || [];
console.log(`  pinned tweets: ${pinnedIds.length}  [${pinnedIds.join(", ")}]`);

if (!userId) {
  console.log("  ERROR: Could not resolve userId.");
  process.exit(1);
}

// ── Phase 2: Discover all own tweets via getUserTweetsAndReplies ──
console.log("\n── Phase 2: Discovery (getUserTweetsAndReplies) ──");

await sleep(2000);

const ownTweetIds = new Set<string>();
for (const pid of pinnedIds) ownTweetIds.add(pid);

const maxTweets = 800;
const batchSize = 100;
let cursor: string | undefined;
let totalFetched = 0;
let pageCount = 0;

while (totalFetched < maxTweets) {
  pageCount++;
  const params: Record<string, unknown> = { userId, count: batchSize } as any;
  if (cursor) params.cursor = cursor;

  const resp = await apiCall(() =>
    (client.getTweetApi() as any).getUserTweetsAndReplies(params),
  ) as any;
  const entries = ((resp.data as any).data || []) as any[];

  if (entries.length === 0) {
    console.log(`  Page ${pageCount}: empty — done`);
    break;
  }

  let ownInPage = 0;
  let otherInPage = 0;
  for (const entry of entries) {
    // Collect all own tweet IDs from this entry and its nested replies
    const collectFrom = (obj: any) => {
      const t = obj.tweet || obj;
      if (!t || !t.legacy) return;
      const lt = t.legacy;
      const authorId = lt.userIdStr || "";
      if (authorId === userId) {
        const tid = String(lt.idStr || t.restId || "");
        if (tid) {
          ownTweetIds.add(tid);
          ownInPage++;
        }
      }
    };

    collectFrom(entry);

    // Walk nested replies (level 1)
    const replies = entry.replies;
    if (Array.isArray(replies)) {
      for (const reply of replies) {
        if (reply && typeof reply === "object") {
          collectFrom(reply);
          // Walk nested replies (level 2)
          const nestedReplies = reply.replies;
          if (Array.isArray(nestedReplies)) {
            for (const nr of nestedReplies) {
              if (nr && typeof nr === "object") collectFrom(nr);
            }
          }
        }
      }
    }
  }

  otherInPage = entries.length - ownInPage;

  totalFetched += entries.length;
  console.log(`  Page ${pageCount}: ${entries.length} entries — ${ownInPage} own, ${otherInPage} other — cumulative own: ${ownTweetIds.size}`);

  const rawData = resp.data as any;
  const cursorObj = rawData.cursor;
  cursor = cursorObj?.bottom?.value || cursorObj?.top?.value;
  if (!cursor) {
    console.log(`  No cursor — end of timeline`);
    break;
  }
  await sleep(2000);
}

const allIds = [...ownTweetIds];
console.log(`\n  Total unique own tweet IDs discovered: ${allIds.length}`);

// ── Phase 3: Fetch full details ──────────────────────────────────
console.log("\n── Phase 3: Tweet Details ──");

interface Collected {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarks: number;
  is_reply: boolean;
  is_quote: boolean;
  is_retweet: boolean;
  created_at: string;
}

const results: Collected[] = [];
let detailCount = 0;
let errorCount = 0;
const skippedIds: string[] = [];

for (const tid of allIds) {
  try {
    await sleep(1000);
    const detailResp = await apiCall(() =>
      client.getTweetApi().getTweetDetail({ focalTweetId: tid }),
    );
    const entries = ((detailResp.data as any).data || []) as any[];

    let found = false;
    for (const entry of entries) {
      const tweetResult = entry.tweet || entry;
      const resultLegacy = tweetResult.legacy;
      if (!resultLegacy) continue;
      const resultId = String(resultLegacy.idStr || tweetResult.restId || "");
      if (resultId === tid) {
        const views = tweetResult.views || entry.views;
        results.push({
          id: tid,
          text: resultLegacy.fullText || "",
          likes: resultLegacy.favoriteCount || 0,
          retweets: (resultLegacy.retweetCount || 0) + (resultLegacy.quoteCount || 0),
          replies: resultLegacy.replyCount || 0,
          views: parseViews(views),
          bookmarks: resultLegacy.bookmarkCount || 0,
          is_reply: Boolean(resultLegacy.inReplyToStatusIdStr),
          is_quote: Boolean(resultLegacy.isQuoteStatus) && !resultLegacy.inReplyToStatusIdStr,
          is_retweet: (resultLegacy.fullText || "").startsWith("RT @"),
          created_at: resultLegacy.createdAt || "",
        });
        detailCount++;
        found = true;
        break;
      }
    }
    if (!found) skippedIds.push(tid);
  } catch (e: any) {
    errorCount++;
    console.warn(`  Error for ${tid}: ${e.message}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────

const tweets = results.filter(r => !r.is_reply && !r.is_retweet);
const replies = results.filter(r => r.is_reply);
const retweets = results.filter(r => r.is_retweet);

console.log(`\n── Summary ──`);
console.log(`  Details fetched:   ${detailCount}`);
console.log(`  Errors:            ${errorCount}`);
console.log(`  Skipped (not found): ${skippedIds.length}`);
console.log(`  ---`);
console.log(`  Tweets:            ${tweets.length}`);
console.log(`  Tweets views:      ${tweets.reduce((s, r) => s + r.views, 0).toLocaleString()}`);
console.log(`  Tweets likes:      ${tweets.reduce((s, r) => s + r.likes, 0).toLocaleString()}`);
console.log(`  Tweets retweets:   ${tweets.reduce((s, r) => s + r.retweets, 0).toLocaleString()}`);
console.log(`  ---`);
console.log(`  Replies:           ${replies.length}`);
console.log(`  Replies views:     ${replies.reduce((s, r) => s + r.views, 0).toLocaleString()}`);
console.log(`  Replies likes:     ${replies.reduce((s, r) => s + r.likes, 0).toLocaleString()}`);
console.log(`  Replies retweets:  ${replies.reduce((s, r) => s + r.retweets, 0).toLocaleString()}`);

console.log(`\n── All Tweets ──`);
for (const r of tweets.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
  console.log(`  [${r.id}] views=${r.views} likes=${r.likes} rt=${r.retweets} | ${r.text.slice(0, 60)}`);
}

console.log(`\n── All Replies ──`);
for (const r of replies.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
  console.log(`  [${r.id}] views=${r.views} likes=${r.likes} rt=${r.retweets} | ${r.text.slice(0, 60)}`);
}

if (retweets.length > 0) {
  console.log(`\n── Retweets ──`);
  for (const r of retweets) {
    console.log(`  [${r.id}] views=${r.views} | ${r.text.slice(0, 60)}`);
  }
}

if (skippedIds.length > 0) {
  console.log(`\n── Skipped IDs (not found in detail) ──`);
  for (const id of skippedIds) {
    console.log(`  ${id}`);
  }
}
