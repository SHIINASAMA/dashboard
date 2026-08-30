// X/Twitter client — wraps twitter-openapi-typescript via _xClient.
import { _xClient } from "../../../scripts/utils";
import { getLogger } from "../../logger";
import { contentWindowDays } from "../../config";
import { collectOwnTweets, entryCreatedAt } from "./XMapper";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function apiCall<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: unknown) {
      if (i === retries - 1) throw e;
      getLogger().warn("X", "API call failed (%s), retrying in %ds", e instanceof Error ? e.message : String(e), 10 * (i + 1));
      await sleep(10_000 * (i + 1));
    }
  }
  throw new Error("unreachable");
}

export class XClient {
  constructor(private token: string, private screenName: string, private userId: string, private pinnedIds: string[] = []) {}

  private async client() { return _xClient(this.token); }

  async fetchProfile(): Promise<{ userData: Record<string, unknown>; legacy: Record<string, unknown>; userId: string }> {
    const client = await this.client();
    const profileResp = await apiCall(() => client.getUserApi().getUserByScreenName({ screenName: this.screenName })) as Record<string, unknown>;
    const userData = profileResp.data as Record<string, unknown>;
    const legacy = ((userData.user as Record<string, unknown>)?.legacy as Record<string, unknown>) || {};
    const userId = String((this.userId || (userData.user as Record<string, unknown>)?.restId || (userData.raw as Record<string, unknown>)?.restId) || "");
    if (!userId) throw new Error(`Could not resolve user ID for @${this.screenName}`);
    return { userData, legacy, userId };
  }

  async discoverOwnTweetIds(userId: string, cutoffMs: number, maxTweets = 800): Promise<{ ids: string[]; skippedOld: number }> {
    const client = await this.client();
    const ownIds = new Set<string>(this.pinnedIds);
    let skippedOld = 0;
    let cursor: string | undefined;
    let totalFetched = 0;
    const batchSize = 100;
    while (totalFetched < maxTweets) {
      const params = { userId, count: batchSize, ...(cursor ? { cursor } : {}) } as Record<string, unknown>;
      const resp = await apiCall(() => (client.getTweetApi() as { getUserTweetsAndReplies(p: Record<string, unknown>): Promise<Record<string, unknown>> }).getUserTweetsAndReplies(params)) as Record<string, unknown>;
      const entries = (((resp.data as Record<string, unknown>)?.data || []) as Array<Record<string, unknown>>);
      if (entries.length === 0) break;
      let batchNewest: number | null = null;
      for (const entry of entries) {
        const ts = entryCreatedAt(entry);
        if (ts !== null) batchNewest = batchNewest === null ? ts : Math.max(batchNewest, ts);
        skippedOld += collectOwnTweets(entry, userId, ownIds, cutoffMs);
      }
      totalFetched += entries.length;
      if (batchNewest !== null && batchNewest < cutoffMs) break;
      const rawData = resp.data as Record<string, unknown>;
      const cursorObj = rawData.cursor as { bottom?: { value?: string }; top?: { value?: string } } | undefined;
      cursor = cursorObj?.bottom?.value || cursorObj?.top?.value;
      if (!cursor) break;
      await sleep(2000);
    }
    return { ids: [...ownIds], skippedOld };
  }

  async fetchTweetDetail(tweetId: string): Promise<Record<string, unknown> | undefined> {
    const client = await this.client();
    const detailResp = await apiCall(() => client.getTweetApi().getTweetDetail({ focalTweetId: tweetId })) as Record<string, unknown>;
    const entries = (((detailResp.data as Record<string, unknown>)?.data || []) as Array<Record<string, unknown>>);
    for (const entry of entries) {
      const legacy = ((entry.tweet || entry) as Record<string, unknown>).legacy;
      if (!legacy) continue;
      const tid = (entry.tweet ?? entry) as Record<string, unknown>;
      const resultId = String((legacy as Record<string, unknown>).idStr || tid.restId || "");
      if (resultId === tweetId) return tid;
    }
    return undefined;
  }

  getWindowCutoffMs(): number {
    return Date.now() - contentWindowDays() * 24 * 60 * 60 * 1000;
  }
}
