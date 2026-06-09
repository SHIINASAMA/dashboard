import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";

export const gitlab_stats = sqliteTable("gitlab_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  public_projects: integer("public_projects").default(0),
  followers: integer("followers").notNull(),
  following: integer("following").notNull(),
  recorded_at: text("recorded_at").notNull().default("(datetime('now'))"),
});

export const gitlab_projects = sqliteTable("gitlab_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  project_id: integer("project_id").notNull(),
  name: text("name").notNull(),
  path_with_namespace: text("path_with_namespace").notNull(),
  description: text("description"),
  language: text("language"),
  stars: integer("stars").default(0),
  forks: integer("forks").default(0),
  open_issues: integer("open_issues").default(0),
  topics: text("topics").default("[]"),
  homepage: text("homepage"),
  is_fork: integer("is_fork").default(0),
  pinned: integer("pinned").default(0),
  visibility: text("visibility").default("public"),
  created_at: text("created_at"),
  updated_at: text("updated_at"),
  last_activity_at: text("last_activity_at"),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const gitlab_project_snapshots = sqliteTable("gitlab_project_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  project_id: integer("project_id").notNull(),
  stars: integer("stars").notNull(),
  forks: integer("forks").default(0),
  open_issues: integer("open_issues").default(0),
  snapshot_date: text("snapshot_date").notNull(),
});

export const gitlab_releases = sqliteTable("gitlab_releases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  project_id: integer("project_id").notNull(),
  release_tag: text("release_tag").notNull(),
  name: text("name"),
  description: text("description"),
  released_at: text("released_at"),
  created_at: text("created_at"),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});

export const gitlab_release_assets = sqliteTable("gitlab_release_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  release_id: integer("release_id").notNull().references(() => gitlab_releases.id),
  name: text("name").notNull(),
  download_count: integer("download_count").default(0),
  size: integer("size").default(0),
  file_type: text("file_type"),
  url: text("url"),
});

export const gitlab_contributions = sqliteTable("gitlab_contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  account_id: integer("account_id").notNull().references(() => accounts.id),
  date: text("date").notNull(),
  count: integer("count").default(0),
  fetched_at: text("fetched_at").notNull().default("(datetime('now'))"),
});
