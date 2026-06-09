import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const github_stats = sqliteTable("github_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  public_repos: integer("public_repos").notNull(),
  public_gists: integer("public_gists").default(0),
  followers: integer("followers").notNull(),
  following: integer("following").notNull(),
  recorded_at: text("recorded_at").notNull().default("(datetime('now'))"),
});

export const github_repos = sqliteTable("github_repos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  name: text("name").notNull(),
  full_name: text("full_name").notNull(),
  description: text("description"),
  language: text("language"),
  stars: integer("stars").default(0),
  forks: integer("forks").default(0),
  open_issues: integer("open_issues").default(0),
  topics: text("topics").default("[]"),
  homepage: text("homepage"),
  is_fork: integer("is_fork").default(0),
  pinned: integer("pinned").default(0),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
  pushed_at: text("pushed_at"),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const github_contributions = sqliteTable("github_contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  date: text("date").notNull(),
  count: integer("count").default(0),
  level: integer("level").default(0),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const github_repo_snapshots = sqliteTable("github_repo_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  stars: integer("stars").notNull(),
  forks: integer("forks").default(0),
  open_issues: integer("open_issues").default(0),
  snapshot_date: text("snapshot_date").notNull(),
});

export const github_traffic_clones = sqliteTable("github_traffic_clones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  date: text("date").notNull(),
  count: integer("count").default(0),
  uniques: integer("uniques").default(0),
});

export const github_traffic_views = sqliteTable("github_traffic_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  date: text("date").notNull(),
  count: integer("count").default(0),
  uniques: integer("uniques").default(0),
});

export const github_referrers = sqliteTable("github_referrers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  referrer: text("referrer").notNull(),
  count: integer("count").default(0),
  uniques: integer("uniques").default(0),
  snapshot_date: text("snapshot_date").notNull().default("(date('now'))"),
});

export const github_paths = sqliteTable("github_paths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  path: text("path").notNull(),
  title: text("title"),
  count: integer("count").default(0),
  uniques: integer("uniques").default(0),
  snapshot_date: text("snapshot_date").notNull().default("(date('now'))"),
});

export const github_releases = sqliteTable("github_releases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  repo_id: integer("repo_id").notNull(),
  release_id: integer("release_id").notNull(),
  tag_name: text("tag_name"),
  name: text("name"),
  body: text("body"),
  prerelease: integer("prerelease").default(0),
  published_at: text("published_at"),
  html_url: text("html_url"),
  total_downloads: integer("total_downloads").default(0),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const github_release_assets = sqliteTable("github_release_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  release_id: integer("release_id").notNull().references(() => github_releases.id),
  name: text("name").notNull(),
  download_count: integer("download_count").default(0),
  size: integer("size").default(0),
  content_type: text("content_type"),
  browser_download_url: text("browser_download_url"),
});
