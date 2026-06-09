import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const user_stats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  followers_count: integer("followers_count").notNull(),
  following_count: integer("following_count").notNull(),
  tweet_count: integer("tweet_count").notNull(),
  listed_count: integer("listed_count").default(0),
  recorded_at: text("recorded_at").notNull().default("(datetime('now'))"),
});

export const tweets = sqliteTable("tweets", {
  id: text("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  full_text: text("full_text").notNull(),
  created_at: text("created_at").notNull(),
  favorite_count: integer("favorite_count").default(0),
  retweet_count: integer("retweet_count").default(0),
  reply_count: integer("reply_count").default(0),
  view_count: integer("view_count").default(0),
  bookmark_count: integer("bookmark_count").default(0),
  is_quote: integer("is_quote").default(0),
  is_reply: integer("is_reply").default(0),
  is_retweet: integer("is_retweet").default(0),
  media_urls: text("media_urls").default("[]"),
  urls: text("urls").default("[]"),
  hashtags: text("hashtags").default("[]"),
  mentions: text("mentions").default("[]"),
  lang: text("lang").default(""),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});
