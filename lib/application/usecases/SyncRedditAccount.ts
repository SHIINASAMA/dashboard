// Reddit new-architecture UseCase: RedditClient (fetch) -> RedditWrite (persist).
import type { Account } from "../../domain/account";
import { RedditClient } from "../../infra/fetchers/RedditClient";
import type { RedditWrite, RedditPost, RedditComment } from "./RedditWrite";
import { getLogger } from "../../logger";
import { contentWindowDays } from "../../config";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface RedditResult { status: "success" | "partial"; posts: number; comments: number; }

export class SyncRedditAccount {
  private client: RedditClient;
  private write?: RedditWrite;

  constructor(account: Account, client?: RedditClient, write?: RedditWrite) {
    this.client = client ?? new RedditClient(account.authType);
    this.write = write;
  }

  private async ensureWrite(): Promise<RedditWrite> {
    if (this.write) return this.write;
    const { RedditRepoRepository } = await import("../../infra/drizzle/RedditRepoRepository");
    this.write = new RedditRepoRepository();
    return this.write;
  }

  async execute(account: Account): Promise<RedditResult> {
    const logger = getLogger();
    const write = await this.ensureWrite();
    const username = account.screenName;
    const token = account.authToken ?? null;
    const isPublic = account.authType === "reddit_public";
    const cutoffUnix = Math.floor(Date.now() / 1000) - contentWindowDays() * 24 * 60 * 60;

    logger.info("Reddit", "Fetching @%s%s...", username, isPublic ? " (public)" : "");

    const profile = await this.client.fetchUser(username, token);
    const pdata = (profile.data ?? {}) as Record<string, unknown>;
    if (!pdata.name) throw new Error("Invalid Reddit user profile");
    await write.insertStats({ account_id: account.id, post_karma: (pdata.link_karma as number) ?? 0, comment_karma: (pdata.comment_karma as number) ?? 0 });
    logger.info("Reddit", "@%s: profile fetched, karma recorded", username);

    let postCount = 0;
    let after: string | undefined;
    const postLimit = isPublic ? 50 : 200;
    while (postCount < postLimit) {
      const posts = await this.client.fetchPosts(username, token, after);
      const children = (posts.data?.children ?? []) as Array<{ data: Record<string, unknown> }>;
      if (children.length === 0) break;
      let hitOld = false;
      for (const child of children) {
        const p = child.data;
        if (!p?.id) continue;
        if (typeof p.created_utc === "number" && p.created_utc < cutoffUnix) { hitOld = true; break; }
        const post: RedditPost = {
          id: p.id as string, account_id: account.id, title: (p.title as string) || "", selftext: (p.selftext as string) || "",
          subreddit: (p.subreddit as string) || "", score: (p.score as number) ?? 0, upvote_ratio: (p.upvote_ratio as number) ?? 0,
          num_comments: (p.num_comments as number) ?? 0, permalink: (p.permalink as string) || "", url: (p.url as string) || "",
          is_self: p.is_self ? 1 : 0, created_utc: Math.round((p.created_utc as number) ?? 0),
        };
        await write.upsertPost(post);
        postCount++;
      }
      if (hitOld) break;
      after = (posts.data?.after as string | undefined) || undefined;
      if (!after) break;
      await sleep(isPublic ? 2000 : 1000);
    }

    let commentCount = 0;
    after = undefined;
    while (commentCount < postLimit) {
      const comments = await this.client.fetchComments(username, token, after);
      const children = (comments.data?.children ?? []) as Array<{ data: Record<string, unknown> }>;
      if (children.length === 0) break;
      let hitOld = false;
      for (const child of children) {
        const c = child.data;
        if (!c?.id) continue;
        if (typeof c.created_utc === "number" && c.created_utc < cutoffUnix) { hitOld = true; break; }
        const comment: RedditComment = {
          id: c.id as string, account_id: account.id, body: (c.body as string) || "", subreddit: (c.subreddit as string) || "",
          score: (c.score as number) ?? 0, link_id: (c.link_id as string) || "", parent_id: (c.parent_id as string) || null,
          depth: (c.depth as number) ?? 0, permalink: (c.permalink as string) || "", created_utc: Math.round((c.created_utc as number) ?? 0),
          is_submitter: c.is_submitter ? 1 : 0,
        };
        await write.upsertComment(comment);
        commentCount++;
      }
      if (hitOld) break;
      after = (comments.data?.after as string | undefined) || undefined;
      if (!after) break;
      await sleep(isPublic ? 2000 : 1000);
    }

    await write.updateAccount(account.id, { last_fetched_at: new Date().toISOString(), user_id: (pdata.id as string) || username, error_message: null } as unknown as Record<string, unknown>);
    logger.info("Reddit", "@%s: done (%d posts, %d comments)", username, postCount, commentCount);
    return { status: "success", posts: postCount, comments: commentCount };
  }
}
