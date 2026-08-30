import { describe, it, expect } from "vitest";
import { SyncXAccount } from "../lib/application/usecases/SyncXAccount";
import { XClient } from "../lib/infra/fetchers/XClient";
import type { XWrite, XTweet } from "../lib/application/usecases/XWrite";
import type { Account } from "../lib/domain/account";

class FakeXClient {
  constructor(private opts: { legacy?: Record<string, unknown>; tweets?: Record<string, unknown>[]; userId?: string } = {}) {}
  async fetchProfile() {
    return { legacy: this.opts.legacy ?? { followersCount: 10, friendsCount: 3, statusesCount: 5, listedCount: 1 }, userId: this.opts.userId ?? "123" };
  }
  async discoverOwnTweetIds(_u: string, _cutoff: number) {
    return { ids: ["1", "2"], skippedOld: 0 };
  }
  async fetchTweetDetail(tid: string) {
    const t = this.opts.tweets?.find(x => String(x.id) === tid);
    return t ?? undefined;
  }
  getWindowCutoffMs() { return Date.now(); }
}

class InMemoryX implements XWrite {
  stats: any[] = [];
  tweets: XTweet[] = [];
  updates: any[] = [];
  async insertStats(s: any) { this.stats.push(s); }
  async upsertTweet(t: XTweet) { this.tweets.push(t); }
  async updateAccount(id: number, updates: any) { this.updates.push({ id, updates }); }
}

function makeTweet(id: string): Record<string, unknown> {
  return { id, tweet: { restId: id, legacy: { idStr: id, fullText: `hello ${id}`, createdAt: "2026-08-29T00:00:00Z", favoriteCount: 5, retweetCount: 1, replyCount: 0, bookmarkCount: 0, lang: "en" } } };
}

const account = { id: 3, screenName: "alice", platform: "twitter" as const, ownerId: 1, instanceUrl: null, isActive: 1, authToken: "tok", userId: "123", authType: null };

describe("SyncXAccount (new arch, no real API)", () => {
  it("writes stats and tweets, returns success", async () => {
    const write = new InMemoryX();
    const uc = new SyncXAccount(account as Account, new FakeXClient({ tweets: [makeTweet("1"), makeTweet("2")] }) as unknown as XClient, write as any);
    const r = await uc.execute();
    expect(r.saved).toBe(2);
    expect(r.errors).toBe(0);
    expect(write.stats[0].followers_count).toBe(10);
    expect(write.tweets.length).toBe(2);
    expect(write.tweets[0].id).toBe("1");
  });
});
