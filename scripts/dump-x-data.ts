/**
 * Dump raw X/Twitter API responses to local files for analysis.
 *
 * Usage: bun run scripts/dump-x-data.ts
 *
 * Saves data to data/dumps/<screen_name>/
 */
import { _xClient } from "./utils";
import { getDb } from "../server/db/connection";
import { accounts } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt, initCrypto } from "../server/crypto";
import { loadOrGenerateKey } from "../server/config";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Bootstrap crypto (required before decrypting tokens)
initCrypto(loadOrGenerateKey());

// decToken: decrypt if encrypted, or return as-is for legacy plaintext tokens
function decToken(cipher: string): string {
  try { return decrypt(cipher); } catch {
    return cipher;
  }
}

const DUMP_DIR = join(import.meta.dirname, "..", "data", "dumps");

// ── Helpers ────────────────────────────────────────────────────────

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

// ── Fetch all pages ────────────────────────────────────────────────

async function fetchAllPages(
  label: string,
  dir: string,
  prefix: string,
  apiFn: (params: any) => Promise<any>,
  userId: string,
  batchSize: number,
) {
  let cursor: string | undefined;
  let page = 0;
  let totalFetched = 0;
  const allTweetIds: string[] = [];

  while (totalFetched < 800) {
    page++;
    const params: Record<string, unknown> = { userId, count: batchSize };
    if (cursor) params.cursor = cursor;

    const resp = await apiCall(() => apiFn(params));
    const fileName = `${prefix}-page-${String(page).padStart(2, "0")}.json`;
    writeFileSync(join(dir, fileName), JSON.stringify(resp.data, null, 2));
    console.log(`  ${label}: saved ${fileName}`);

    const entries = ((resp.data as any).data || []) as any[];

    if (entries.length === 0) {
      console.log(`  ${label}: no more entries (empty page)`);
      break;
    }

    // Collect tweet IDs for later detail fetching
    for (const entry of entries) {
      const t = entry?.tweet ?? entry;
      const legacy = t?.legacy;
      if (!legacy) continue;
      const tid = legacy?.idStr;
      if (tid) allTweetIds.push(String(tid));
    }

    totalFetched += entries.length;
    const rawData = resp.data as any;
    const cursorObj = rawData.cursor;
    cursor = cursorObj?.bottom?.value || cursorObj?.top?.value;
    if (!cursor) {
      console.log(`  ${label}: no cursor after ${totalFetched} entries`);
      break;
    }

    console.log(`  ${label}: ${totalFetched} entries so far, next page...`);
    await sleep(2000);
  }

  console.log(`  ${label}: done — ${totalFetched} total entries, ${page} pages`);
  return allTweetIds;
}

// ── Main ───────────────────────────────────────────────────────────

console.log("=== X/Twitter API Data Dump ===\n");

// Get active X accounts from database
const db = getDb();
const rows = await db.select().from(accounts)
  .where(and(eq(accounts.is_active, 1), eq(accounts.platform, "twitter"), isNull(accounts.deleted_at)));

if (rows.length === 0) {
  console.log("No active Twitter accounts found.");
  process.exit(0);
}

console.log(`Found ${rows.length} active Twitter account(s).\n`);

for (const account of rows) {
  const token = decToken(account.auth_token);
  const screenName = account.screen_name;
  const resolvedUserId = account.user_id;

  console.log(`\n=== @${screenName} (id=${account.id}, userId=${resolvedUserId}) ===\n`);

  const dir = join(DUMP_DIR, screenName);
  mkdirSync(dir, { recursive: true });

  const client = await _xClient(token);
  await sleep(1000);

  // 1. User profile
  console.log("1. Fetching user profile...");
  const profileResp = await apiCall(() =>
    client.getUserApi().getUserByScreenName({ screenName }),
  );
  writeFileSync(join(dir, "01-user-profile.json"), JSON.stringify(profileResp.data, null, 2));
  console.log("  Saved 01-user-profile.json");

  const userData = profileResp.data as any;
  const legacy = userData.user?.legacy || {};

  let userId = resolvedUserId;
  if (!userId) {
    userId = userData.user?.restId || userData.raw?.restId || "";
    console.log(`  Resolved userId: ${userId}`);
  }
  if (!userId) {
    console.log("  ERROR: Could not resolve userId, skipping this account.");
    continue;
  }

  await sleep(2000);

  // 2. Collect all unique tweet IDs
  const allIds = new Set<string>();

  // 2a. getUserTweets
  console.log("\n2a. Fetching getUserTweets...");
  const tweetsIds = await fetchAllPages(
    "getUserTweets",
    dir,
    "02-user-tweets",
    (params) => client.getTweetApi().getUserTweets(params),
    userId,
    100,
  );
  tweetsIds.forEach((id) => allIds.add(id));

  await sleep(2000);

  // 2b. getUserTweetsAndReplies
  console.log("\n2b. Fetching getUserTweetsAndReplies...");
  const repliesIds = await fetchAllPages(
    "getUserTweetsAndReplies",
    dir,
    "03-user-tweets-replies",
    (params) => client.getTweetApi().getUserTweetsAndReplies(params),
    userId,
    100,
  );
  repliesIds.forEach((id) => allIds.add(id));

  // 3. Fetch tweet details for every unique tweet ID
  const uniqueIds = [...allIds];
  console.log(`\n3. Fetching tweet details for ${uniqueIds.length} unique tweets...`);
  const detailsDir = join(dir, "04-tweet-details");
  mkdirSync(detailsDir, { recursive: true });

  let detailCount = 0;
  for (const tid of uniqueIds) {
    try {
      await sleep(1000);
      const detailResp = await apiCall(() =>
        client.getTweetApi().getTweetDetail({ focalTweetId: tid }),
      );
      writeFileSync(join(detailsDir, `${tid}.json`), JSON.stringify(detailResp.data, null, 2));
      detailCount++;
      if (detailCount % 10 === 0) {
        console.log(`  ${detailCount}/${uniqueIds.length} details fetched...`);
      }
    } catch (e: any) {
      console.warn(`  WARN: Failed to get detail for ${tid}: ${e.message}`);
    }
  }
  console.log(`  Done: ${detailCount}/${uniqueIds.length} details saved`);

  // 4. Write manifest
  const pinnedIds: string[] = (legacy.pinnedTweetIdsStr as string[]) || [];
  const manifest = {
    screenName,
    accountId: account.id,
    userId,
    pinnedTweetIds: pinnedIds,
    profile: {
      followers: legacy.followersCount ?? 0,
      following: legacy.friendsCount ?? 0,
      tweets: legacy.statusesCount ?? 0,
      listed: legacy.listedCount ?? 0,
    },
    counts: {
      getUserTweets: tweetsIds.length,
      getUserTweetsAndReplies: repliesIds.length,
      uniqueTweets: allIds.size,
      tweetDetailsFetched: detailCount,
    },
    dumpedAt: new Date().toISOString(),
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\n  Manifest saved.");
}

console.log("\n=== Dump complete ===");
