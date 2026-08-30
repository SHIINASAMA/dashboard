import type { RedditWrite, RedditPost, RedditComment } from "../../application/usecases/RedditWrite";

export class RedditRepoRepository implements RedditWrite {
  async insertStats(s: { account_id: number; post_karma: number; comment_karma: number }): Promise<void> {
    const { insertRedditStats } = await import("../../repositories/reddit");
    await insertRedditStats(s);
  }
  async upsertPost(p: RedditPost): Promise<void> {
    const { upsertRedditPost } = await import("../../repositories/reddit");
    await upsertRedditPost(p);
  }
  async upsertComment(c: RedditComment): Promise<void> {
    const { upsertRedditComment } = await import("../../repositories/reddit");
    await upsertRedditComment(c);
  }
  async updateAccount(id: number, updates: Record<string, unknown>): Promise<void> {
    const { updateAccount } = await import("../../repositories/accounts");
    await updateAccount(id, updates as never);
  }
}
