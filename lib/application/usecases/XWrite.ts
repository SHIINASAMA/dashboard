export interface XTweet {
  id: string; account_id: number; full_text: string; created_at: string;
  favorite_count: number; retweet_count: number; reply_count: number; view_count: number;
  bookmark_count: number; is_quote: number; is_reply: number; is_retweet: number;
  media_urls: string; urls: string; hashtags: string; mentions: string; lang: string;
}
export interface XWrite {
  insertStats(s: { account_id: number; followers_count: number; following_count: number; tweet_count: number; listed_count: number }): Promise<void>;
  upsertTweet(t: XTweet): Promise<void>;
  updateAccount(id: number, updates: Record<string, unknown>): Promise<void>;
}
