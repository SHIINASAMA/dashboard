export interface RedditPost {
  id: string; account_id: number; title: string; selftext: string; subreddit: string;
  score: number; upvote_ratio: number; num_comments: number; permalink: string; url: string;
  is_self: number; created_utc: number;
}
export interface RedditComment {
  id: string; account_id: number; body: string; subreddit: string; score: number;
  link_id: string; parent_id: string | null; depth: number; permalink: string;
  created_utc: number; is_submitter: number;
}
export interface RedditWrite {
  insertStats(s: { account_id: number; post_karma: number; comment_karma: number }): Promise<void>;
  upsertPost(p: RedditPost): Promise<void>;
  upsertComment(c: RedditComment): Promise<void>;
  updateAccount(id: number, updates: Record<string, unknown>): Promise<void>;
}
