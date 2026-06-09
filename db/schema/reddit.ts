import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const reddit_stats = sqliteTable("reddit_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  post_karma: integer("post_karma").notNull(),
  comment_karma: integer("comment_karma").notNull(),
  recorded_at: text("recorded_at").notNull().default("(datetime('now'))"),
});

export const reddit_posts = sqliteTable("reddit_posts", {
  id: text("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  title: text("title").notNull(),
  selftext: text("selftext").notNull().default(""),
  subreddit: text("subreddit").notNull(),
  score: integer("score").default(0),
  upvote_ratio: real("upvote_ratio").default(0),
  num_comments: integer("num_comments").default(0),
  permalink: text("permalink").notNull(),
  url: text("url").default(""),
  is_self: integer("is_self").default(0),
  created_utc: integer("created_utc").notNull(),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const reddit_comments = sqliteTable("reddit_comments", {
  id: text("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  body: text("body").notNull(),
  subreddit: text("subreddit").notNull(),
  score: integer("score").default(0),
  link_id: text("link_id").notNull(),
  parent_id: text("parent_id"),
  depth: integer("depth").default(0),
  permalink: text("permalink").notNull(),
  created_utc: integer("created_utc").notNull(),
  is_submitter: integer("is_submitter").default(0),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});
