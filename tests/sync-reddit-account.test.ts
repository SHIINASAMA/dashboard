import { describe, it, expect } from "vitest";
import { SyncRedditAccount } from "../lib/application/usecases/SyncRedditAccount";
import type { RedditWrite, RedditPost, RedditComment } from "../lib/application/usecases/RedditWrite";
import type { Account } from "../lib/domain/account";

class FakeRedditClient {
  constructor(private opts: { isPublic?: boolean } = {}) {}
  async fetchUser(_u: string, _t: string | null) {
    return { data: { name: "alice", id: "t2_1", link_karma: 100, comment_karma: 50 } };
  }
  async fetchPosts(_u: string, _t: string | null, after?: string) {
    if (after) return { data: { children: [], after: undefined } };
    return { data: { children: [{ data: { id: "p1", title: "hi", selftext: "", subreddit: "r1", score: 5, upvote_ratio: 0.9, num_comments: 1, permalink: "/r1", url: "https://x", is_self: 0, created_utc: Math.floor(Date.now()/1000) - 1000 } }], after: "t3" } };
  }
  async fetchComments(_u: string, _t: string | null, after?: string) {
    if (after) return { data: { children: [], after: undefined } };
    return { data: { children: [{ data: { id: "c1", body: "yo", subreddit: "r1", score: 2, link_id: "t3_1", parent_id: null, depth: 0, permalink: "/r1/c1", created_utc: Math.floor(Date.now()/1000) - 2000, is_submitter: 1 } }], after: "t5" } };
  }
}

class InMemoryReddit implements RedditWrite {
  stats: any[] = [];
  posts: RedditPost[] = [];
  comments: RedditComment[] = [];
  updates: any[] = [];
  async insertStats(s: any) { this.stats.push(s); }
  async upsertPost(p: RedditPost) { this.posts.push(p); }
  async upsertComment(c: RedditComment) { this.comments.push(c); }
  async updateAccount(id: number, updates: any) { this.updates.push({ id, updates }); }
}

const account = { id: 9, screenName: "alice", platform: "reddit" as const, ownerId: 1, instanceUrl: null, isActive: 1, authToken: "refresh-or-cookie", authType: null };

describe("SyncRedditAccount (new arch, no PG)", () => {
  it("writes profile stats, posts, comments", async () => {
    const write = new InMemoryReddit();
    const uc = new SyncRedditAccount(account as Account, new FakeRedditClient() as any, write as any);
    const r = await uc.execute(account as Account);
    expect(r.posts).toBe(1);
    expect(r.comments).toBe(1);
    expect(write.stats[0]).toMatchObject({ post_karma: 100, comment_karma: 50 });
    expect(write.posts.length).toBe(1);
    expect(write.comments.length).toBe(1);
    expect(write.updates[0].updates.user_id).toBe("t2_1");
  });
});
