import type { XWrite, XTweet } from "../../application/usecases/XWrite";

export class XRepoRepository implements XWrite {
  async insertStats(s: { account_id: number; followers_count: number; following_count: number; tweet_count: number; listed_count: number }): Promise<void> {
    const { insertUserStats } = await import("../../repositories/twitter");
    await insertUserStats(s);
  }
  async upsertTweet(t: XTweet): Promise<void> {
    const { upsertTweet } = await import("../../repositories/twitter");
    await upsertTweet(t);
  }
  async updateAccount(id: number, updates: Record<string, unknown>): Promise<void> {
    const { updateAccount } = await import("../../repositories/accounts");
    await updateAccount(id, updates as never);
  }
}
