# Multi-User + Drizzle ORM Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from raw SQLite queries to Drizzle ORM with multi-user support, confirmation dialogs for destructive actions, and admin user management UI.

**Architecture:** Drizzle ORM replaces raw SQL with typed schemas in `db/schema/` and queries in `db/queries/`. Multi-user auth adds a `users` table with `admin`/`user` roles and `owner_id` on accounts. A reusable `ConfirmDialog` component enforces typed-token confirmation for deletes.

**Tech Stack:** Bun, Drizzle ORM (`drizzle-orm`, `drizzle-kit`), `better-sqlite3` (via `@libsql/client`), React 19, shadcn/ui, Hono

---

### Task 1: Install Drizzle ORM dependencies

**Files:**
- Modify: `package.json`
- Modify: `client/package.json` (no changes needed, server only)

- [ ] **Step 1: Install Drizzle packages**

```bash
cd /Users/kaoru/Developer/dashboard && bun add drizzle-orm drizzle-kit @libsql/client
```

Expected: packages added to `package.json` and `node_modules/`.

- [ ] **Step 2: Verify installation**

```bash
bun run --eval "import { sql } from 'drizzle-orm'; console.log('ok')"
```

Expected: prints "ok".

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add drizzle-orm, drizzle-kit, @libsql/client"
```

---

### Task 2: Create Drizzle database connection layer

**Files:**
- Modify: `server/config.ts` — add `DatabaseConfig` type
- Create: `server/db/connection.ts` — Drizzle client factory

- [ ] **Step 1: Add DatabaseConfig to config.ts**

Read `server/config.ts`, then edit — add after the `DashboardConfig` interface:

```ts
export interface DatabaseConfig {
  driver: "sqlite" | "postgresql";
  sqlite: { path: string };
  postgresql?: { host: string; port: number; database: string; user: string; password: string };
}
```

Add `database` field to `DashboardConfig`:

```ts
export interface DashboardConfig {
  urlPrefix: string;
  host: string;
  port: number;
  https: boolean;
  passwordHash: string;
  database: DatabaseConfig;
}
```

Add to `DEFAULTS`:

```ts
const DEFAULTS: DashboardConfig = {
  urlPrefix: "",
  host: "localhost",
  port: 3001,
  https: false,
  passwordHash: "",
  database: {
    driver: "sqlite",
    sqlite: { path: join(dataDir(), "db", "dashboard.db") },
  },
};
```

- [ ] **Step 2: Create server/db/connection.ts**

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { loadConfig, type DatabaseConfig } from "../config";
import * as schema from "../../db/schema/index";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const cfg = loadConfig().database;
    if (cfg.driver === "sqlite") {
      const client = createClient({ url: `file:${cfg.sqlite.path}` });
      _db = drizzle(client, { schema });
    } else if (cfg.driver === "postgresql" && cfg.postgresql) {
      // PostgreSQL support — not yet active, reserved for future
      throw new Error("PostgreSQL driver not yet implemented. Use sqlite.");
    } else {
      throw new Error(`Unknown database driver: ${cfg.driver}`);
    }
  }
  return _db;
}

export function closeDb() {
  _db = null;
}
```

- [ ] **Step 3: Verify the connection file compiles**

```bash
cd /Users/kaoru/Developer/dashboard && bun run --eval "import './server/db/connection.ts'; console.log('ok')"
```

Expected: prints "ok" (note: will fail if schema/index.ts doesn't exist yet — that's OK, we create it next).

- [ ] **Step 4: Commit**

```bash
git add server/db/connection.ts server/config.ts
git commit -m "feat: add Drizzle database connection layer with SQLite driver"
```

---

### Task 3: Define Drizzle schemas for all tables

**Files:**
- Create: `db/schema/users.ts`
- Create: `db/schema/accounts.ts`
- Create: `db/schema/twitter.ts`
- Create: `db/schema/github.ts`
- Create: `db/schema/gitlab.ts`
- Create: `db/schema/reddit.ts`
- Create: `db/schema/settings.ts`
- Create: `db/schema/index.ts`
- Remove: `db/schema.ts` (old migrations file kept for reference, but not imported)

- [ ] **Step 1: Create db/schema/users.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // "admin" | "user"
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
});
```

- [ ] **Step 2: Create db/schema/accounts.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  screenName: text("screen_name").notNull(),
  platform: text("platform").notNull().default("twitter"),
  userId: text("user_id"),
  authToken: text("auth_token").notNull(),
  fetchInterval: integer("fetch_interval").default(30),
  isActive: integer("is_active").default(1),
  lastFetchedAt: text("last_fetched_at"),
  errorMessage: text("error_message"),
  instanceUrl: text("instance_url"),
  authType: text("auth_type"),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
  updatedAt: text("updated_at").notNull().default("(datetime('now'))"),
}, (table) => ({
  uniqueScreenNamePlatform: sqliteUniqueIndex("idx_accounts_screen_name_platform").on(table.ownerId, table.screenName, table.platform),
}));
```

Wait — let me keep it simpler and closer to the existing schema. Let me rewrite these schemas to match the actual table structure exactly, using explicit CREATE TABLE-compatible definitions.

Actually, let me reconsider. The existing `db/schema.ts` has a migration system that uses raw SQL. We need to:
1. Keep the existing tables working (same column names, types)
2. Add the new `users` table
3. Add `owner_id` to `accounts`

I'll use Drizzle's SQLite column types that map directly. Using snake_case column names to match the existing DB.

- [ ] **Step 1 (rewritten): Create db/schema/users.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
});
```

- [ ] **Step 2 (rewritten): Create db/schema/accounts.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner_id: integer("owner_id").notNull().references(() => users.id),
  screen_name: text("screen_name").notNull(),
  platform: text("platform").notNull().default("twitter"),
  user_id: text("user_id"),
  auth_token: text("auth_token").notNull(),
  fetch_interval: integer("fetch_interval").default(30),
  is_active: integer("is_active").default(1),
  last_fetched_at: text("last_fetched_at"),
  error_message: text("error_message"),
  instance_url: text("instance_url"),
  auth_type: text("auth_type"),
  created_at: text("created_at").notNull().default("(datetime('now'))"),
  updated_at: text("updated_at").notNull().default("(datetime('now'))"),
});
```

- [ ] **Step 3: Create db/schema/twitter.ts**

```ts
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
```

- [ ] **Step 4: Create db/schema/github.ts**

```ts
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
```

- [ ] **Step 5: Create db/schema/gitlab.ts**

```ts
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
```

- [ ] **Step 6: Create db/schema/reddit.ts**

```ts
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
```

- [ ] **Step 7: Create db/schema/settings.ts**

```ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

- [ ] **Step 8: Create db/schema/index.ts**

```ts
export { users } from "./users";
export { accounts } from "./accounts";
export { user_stats, tweets } from "./twitter";
export {
  github_stats, github_repos, github_contributions,
  github_repo_snapshots, github_traffic_clones, github_traffic_views,
  github_referrers, github_paths, github_releases, github_release_assets,
} from "./github";
export {
  gitlab_stats, gitlab_projects, gitlab_project_snapshots,
  gitlab_releases, gitlab_release_assets, gitlab_contributions,
} from "./gitlab";
export { reddit_stats, reddit_posts, reddit_comments } from "./reddit";
export { settings } from "./settings";
```

- [ ] **Step 9: Verify schema files compile**

```bash
cd /Users/kaoru/Developer/dashboard && bun run --eval "import './db/schema/index'; console.log('schemas ok')"
```

Expected: prints "schemas ok".

- [ ] **Step 10: Commit**

```bash
git add db/schema/
git commit -m "feat: define Drizzle schemas for all tables including users"
```

---

### Task 4: Database migration — add users table and owner_id

**Files:**
- Create: `db/migrate.ts` — one-shot migration script
- Modify: `server/setup.ts` — run migration on bootstrap

- [ ] **Step 1: Backup the database**

```bash
cp /Users/kaoru/Developer/dashboard/data/db/dashboard.db /Users/kaoru/Developer/dashboard/data/db/dashboard.db.backup-$(date +%Y%m%d-%H%M%S)
```

- [ ] **Step 2: Create db/migrate.ts**

```ts
import { Database } from "bun:sqlite";
import { dbPath } from "../server/config";

// One-shot migration: add users table, owner_id to accounts, migrate password hash
export function runMigrations() {
  const db = new Database(dbPath());
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");

  // Check if users table already exists
  const hasUsers = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (hasUsers) {
    console.log("[Migration] users table already exists, skipping");
    db.close();
    return;
  }

  console.log("[Migration] Creating users table...");
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Check if owner_id already exists on accounts
  const cols = db.query("PRAGMA table_info(accounts)").all() as { name: string }[];
  const hasOwnerId = cols.some(c => c.name === "owner_id");
  if (!hasOwnerId) {
    console.log("[Migration] Adding owner_id to accounts...");
    db.exec("ALTER TABLE accounts ADD COLUMN owner_id INTEGER REFERENCES users(id)");
    // Assign all existing accounts to the bootstrap admin (id=1)
    db.exec("UPDATE accounts SET owner_id = 1 WHERE owner_id IS NULL");
  }

  // Create missing indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
    CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at);
    CREATE INDEX IF NOT EXISTS idx_tweets_account_id ON tweets(account_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_account_id ON user_stats(account_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_recorded_at ON user_stats(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_github_stats_account_id ON github_stats(account_id);
    CREATE INDEX IF NOT EXISTS idx_github_repos_account_id ON github_repos(account_id);
    CREATE INDEX IF NOT EXISTS idx_github_contributions_account_id ON github_contributions(account_id);
    CREATE INDEX IF NOT EXISTS idx_github_traffic_clones_repo ON github_traffic_clones(account_id, repo_id);
    CREATE INDEX IF NOT EXISTS idx_github_traffic_views_repo ON github_traffic_views(account_id, repo_id);
    CREATE INDEX IF NOT EXISTS idx_github_repo_snapshots_repo ON github_repo_snapshots(account_id, repo_id);
    CREATE INDEX IF NOT EXISTS idx_github_releases_repo ON github_releases(account_id, repo_id);
    CREATE INDEX IF NOT EXISTS idx_gitlab_stats_account_id ON gitlab_stats(account_id);
    CREATE INDEX IF NOT EXISTS idx_gitlab_projects_account_id ON gitlab_projects(account_id);
    CREATE INDEX IF NOT EXISTS idx_gitlab_project_snapshots_repo ON gitlab_project_snapshots(account_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_gitlab_releases_project ON gitlab_releases(account_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_gitlab_contributions_account_id ON gitlab_contributions(account_id);
    CREATE INDEX IF NOT EXISTS idx_reddit_stats_account_id ON reddit_stats(account_id);
    CREATE INDEX IF NOT EXISTS idx_reddit_posts_account_id ON reddit_posts(account_id);
    CREATE INDEX IF NOT EXISTS idx_reddit_posts_created_utc ON reddit_posts(created_utc);
    CREATE INDEX IF NOT EXISTS idx_reddit_comments_account_id ON reddit_comments(account_id);
  `);

  console.log("[Migration] Complete");
  db.close();
}
```

- [ ] **Step 3: Update server/setup.ts to call migration**

Read `server/setup.ts`, then edit to add after `const key = loadOrGenerateKey();`:

```ts
import { runMigrations } from "../db/migrate";

// After initCrypto(key):
// 3. Run database migrations
runMigrations();
```

- [ ] **Step 4: Run migration**

```bash
cd /Users/kaoru/Developer/dashboard && bun run server/setup.ts 2>&1 || bun run --eval "import { runMigrations } from './db/migrate'; runMigrations();"
```

Expected: prints "[Migration] Creating users table..." and "[Migration] Complete".

- [ ] **Step 5: Verify the migrated tables**

```bash
bun run --eval "
import { Database } from 'bun:sqlite';
const db = new Database('data/db/dashboard.db');
console.log('users:', db.query('SELECT count(*) as c FROM users').get());
console.log('accounts owner_id:', db.query('SELECT id, screen_name, owner_id FROM accounts LIMIT 3').all());
db.close();
"
```

Expected: users table with 0 rows, accounts all have owner_id = 1.

- [ ] **Step 6: Commit**

```bash
git add db/migrate.ts server/setup.ts
git commit -m "feat: add users table migration and owner_id to accounts"
```

---

### Task 5: Create Drizzle query layer

**Files:**
- Create: `server/db/queries/accounts.ts`
- Create: `server/db/queries/twitter.ts`
- Create: `server/db/queries/github.ts`
- Create: `server/db/queries/gitlab.ts`
- Create: `server/db/queries/reddit.ts`
- Create: `server/db/queries/users.ts`
- Create: `server/db/queries/index.ts`

Since this is a large refactor, each query file re-exports the same function signatures currently in `server/db.ts`, but uses Drizzle's query builder. The old `server/db.ts` will be replaced gradually (Task 8 wires everything together).

For brevity in this plan, each query file is described:

- `users.ts`: `getUserByUsername(username)`, `createUser(username, passwordHash, role?)`, `getUsers()`, `deleteUser(id)`, `getUserById(id)`, `updateUserPassword(id, hash)`
- `accounts.ts`: `getAccounts(ownerId?)`, `getAccountById(id)`, `createAccount(...)`, `updateAccount(id, updates)`, `deleteAccount(id)`
- `twitter.ts`: `getOverviewStats(accountIds?)`, `getTweets(...)`, `getTweetById(id)`, `getTimelineStats(months, accountIds?)`, `getTopTweets(metric, limit, accountIds?)`, `getCalendarData(year, accountIds?)`, `upsertTweet(tweet)`, `insertUserStats(stats)`, `getLatestUserStats(accountId)`
- `github.ts`: all current github query functions
- `gitlab.ts`: all current gitlab query functions
- `reddit.ts`: all current reddit query functions
- `index.ts`: re-exports all from above

Given the massive scope of this task (650+ lines of db.ts to refactor), let me provide the full implementation inline. I'll write it as a batch of files.

Actually — given the plan size, let me make this plan more executable. Each query file for the sub-domains follows the same pattern: replace `getDb()` (Bun SQLite) with `getDb()` (Drizzle), keep function signatures identical. The key insight is that callers don't change their imports, they still import from `"../db"` — so the plan's main work is rewriting the internals of each function.

Rather than listing every function line-by-line, the implementation step is: for each query file, rewrite the function body using Drizzle's `db.select().from(table).where(eq(...))` etc. while preserving the return type.

- [ ] **Step 1: Create server/db/queries/users.ts**

```ts
import { eq } from "drizzle-orm";
import { getDb } from "../connection";
import { users } from "../../../db/schema";
import { password } from "bun";

export type UserRow = typeof users.$inferSelect;
export type UserPublic = Omit<UserRow, "password_hash">;

export function getUserByUsername(username: string): UserRow | undefined {
  const db = getDb();
  return db.select().from(users).where(eq(users.username, username)).get();
}

export function getUserById(id: number): UserRow | undefined {
  const db = getDb();
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function createUser(username: string, pw: string, role: "admin" | "user" = "user"): Promise<UserRow> {
  const db = getDb();
  const hash = await password.hash(pw, { algorithm: "argon2id" });
  db.insert(users).values({ username, password_hash: hash, role }).run();
  return db.select().from(users).where(eq(users.username, username)).get()!;
}

export function getUsers(): UserPublic[] {
  const db = getDb();
  return db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    created_at: users.created_at,
  }).from(users).all();
}

export function deleteUser(id: number) {
  const db = getDb();
  // Delete all accounts owned by this user (cascading handled in account delete)
  const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.owner_id, id)).all();
  for (const acc of userAccounts) {
    deleteAccountById(acc.id);
  }
  db.delete(users).where(eq(users.id, id)).run();
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const hash = await password.hash(newPassword, { algorithm: "argon2id" });
  getDb().update(users).set({ password_hash: hash }).where(eq(users.id, id)).run();
}

// import at bottom to avoid circularity
import { accounts } from "../../../db/schema";
import { deleteAccount as deleteAccountById } from "./accounts";
```

Note: the `deleteUser` function has a circular dependency issue. Let me restructure — `deleteAccountById` is a low-level function in accounts.ts that doesn't import users.ts. I'll add it there.

- [ ] **Step 2-7: Create remaining query files**

Due to the volume (each file mirrors the corresponding section of the existing `server/db.ts`), I'll create them inline during implementation rather than enumerating every function in the plan. The pattern is consistent across all files.

Key changes from old `server/db.ts`:
1. `getDb()` now returns a Drizzle instance instead of `bun:sqlite` Database
2. `encToken`/`decToken` move to `server/db/queries/accounts.ts`
3. All query functions preserve their existing signatures and return types
4. Account queries add `ownerId` parameter filtering

- [ ] **Step 8: Create server/db/queries/index.ts**

```ts
export * from "./users";
export * from "./accounts";
export * from "./twitter";
export * from "./github";
export * from "./gitlab";
export * from "./reddit";
export { getSetting, setSetting } from "./settings";
```

- [ ] **Step 9: Create server/db/queries/settings.ts**

```ts
import { eq } from "drizzle-orm";
import { getDb } from "../connection";
import { settings } from "../../../db/schema";

export function getSetting(key: string): string | null {
  const row = getDb().select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}
```

- [ ] **Step 10: Verify queries compile**

```bash
cd /Users/kaoru/Developer/dashboard && bun run --eval "import './server/db/queries/index'; console.log('queries ok')"
```

- [ ] **Step 11: Commit**

```bash
git add server/db/queries/
git commit -m "feat: create Drizzle query layer for all domains"
```

---

### Task 6: Wire Drizzle queries into routes and fetchers

**Files:**
- Modify: `server/routes/accounts.ts` — import from `../db/queries`
- Modify: `server/routes/tweets.ts` — import from `../db/queries`
- Modify: `server/routes/stats.ts` — import from `../db/queries`
- Modify: `server/routes/github.ts` — import from `../db/queries`
- Modify: `server/routes/gitlab.ts` — import from `../db/queries`
- Modify: `server/routes/reddit.ts` — import from `../db/queries`
- Modify: `server/fetchers/github.ts` — import from `../db/queries`
- Modify: `server/fetchers/gitlab.ts` — import from `../db/queries`
- Modify: `server/fetchers/reddit.ts` — import from `../db/queries`
- Modify: `server/fetcher.ts` — import from `../db/queries`

- [ ] **Step 1: Update server/routes/accounts.ts imports**

Read `server/routes/accounts.ts`, then edit line 2-10:

Change:
```ts
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getOverviewStats,
  getLatestUserStats,
} from "../db";
```

To:
```ts
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getOverviewStats,
  getLatestUserStats,
} from "../db/queries";
```

- [ ] **Step 2: Repeat import updates for all other route/fetcher files**

Same pattern for each file — change `from "../db"` to `from "../db/queries"`.

Files to update:
- `server/routes/tweets.ts`
- `server/routes/stats.ts`
- `server/routes/github.ts`
- `server/routes/gitlab.ts`
- `server/routes/reddit.ts`
- `server/fetchers/github.ts`
- `server/fetchers/gitlab.ts`
- `server/fetchers/reddit.ts`
- `server/fetcher.ts` (the Twitter fetcher)
- `server/scheduler.ts`

- [ ] **Step 3: Update server/db.ts to re-export from queries**

Read `server/db.ts`, replace all content:

```ts
// Re-export from Drizzle query layer for backward compatibility
export * from "./db/queries";
```

- [ ] **Step 4: Verify the app starts**

```bash
cd /Users/kaoru/Developer/dashboard && timeout 5 bun run server 2>&1 || true
```

Expected: server starts without import errors.

- [ ] **Step 5: Commit**

```bash
git add server/routes/ server/fetchers/ server/scheduler.ts server/db.ts
git commit -m "refactor: wire Drizzle queries into all routes and fetchers"
```

---

### Task 7: Multi-user auth — update login, session, bootstrap

**Files:**
- Modify: `server/auth.ts` — use users table instead of config.json
- Modify: `server/index.ts` — add username to login, session role, user CRUD routes
- Modify: `server/setup.ts` — bootstrap admin user from config.json password

- [ ] **Step 1: Rewrite server/auth.ts**

```ts
import { password } from "bun";
import { getUserByUsername, getUserById, updateUserPassword } from "./db/queries/users";

export async function verifyCredentials(username: string, pw: string): Promise<{ ok: boolean; userId?: number; role?: string }> {
  const user = getUserByUsername(username);
  if (!user) return { ok: false };
  const valid = await password.verify(pw, user.password_hash);
  if (!valid) return { ok: false };
  return { ok: true, userId: user.id, role: user.role };
}

export async function setUserPassword(userId: number, pw: string): Promise<void> {
  await updateUserPassword(userId, pw);
}

// Legacy: verifyPassword for the old single-password flow (used during bootstrap)
export async function verifyPassword(input: string): Promise<boolean> {
  const { getUserByUsername } = await import("./db/queries/users");
  const user = getUserByUsername("admin");
  if (!user) return true; // no users yet, open access
  return password.verify(input, user.password_hash);
}
```

- [ ] **Step 2: Update server/index.ts auth routes**

Change `POST /api/auth/login` to accept `{ username, password }`:

```ts
app.post(`${BASE}/api/auth/login`, async (c) => {
  try {
    const { username, password } = await c.req.json();
    const result = await verifyCredentials(username || "admin", password);
    if (!result.ok) {
      await new Promise(r => setTimeout(r, 800));
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const session = createSessionToken(username || "admin", result.role || "admin");
    setCookie(c, SESSION_COOKIE, session, { /* same options */ });
    return c.json({ ok: true, user: username || "admin", role: result.role });
  } catch (e) {
    return c.json({ error: "Invalid request" }, 400);
  }
});
```

Update `createSessionToken` to include role:

```ts
function createSessionToken(username: string, role: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}:${role}:${expires}`;
  const sig = sign(payload);
  return `${payload}:${sig}`;
}

function validateSession(token: string): { username: string; role: string } | null {
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [username, role, expiresStr, sig] = parts;
  const payload = `${username}:${role}:${expiresStr}`;
  if (!verifySignature(payload, sig)) return null;
  if (parseInt(expiresStr) < Date.now()) return null;
  return { username, role };
}
```

Update auth middleware to set both:

```ts
const sessionUser = validateSession(token);
if (!sessionUser) { /* 401 */ }
c.set("sessionUser", sessionUser.username);
c.set("sessionRole", sessionUser.role);
```

Update `GET /api/auth/me`:

```ts
app.get(`${BASE}/api/auth/me`, (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ authenticated: false });
  const session = validateSession(token);
  if (!session) return c.json({ authenticated: false });
  return c.json({ authenticated: true, username: session.username, role: session.role });
});
```

- [ ] **Step 3: Add user management routes**

Add after the auth routes in `server/index.ts`:

```ts
// ── User management (admin only) ──────────────────────────────────
import { getUsers, createUser, deleteUser } from "./db/queries/users";

app.get(`${BASE}/api/users`, (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  return c.json({ users: getUsers() });
});

app.post(`${BASE}/api/users`, async (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  const { username, password, role } = await c.req.json();
  if (!username || !password) return c.json({ error: "username and password required" }, 400);
  try {
    const user = await createUser(username, password, role || "user");
    const { password_hash, ...pub } = user;
    return c.json(pub, 201);
  } catch (e: any) {
    if (e.message?.includes?.("UNIQUE")) return c.json({ error: "Username already exists" }, 409);
    return c.json({ error: e.message }, 500);
  }
});

app.delete(`${BASE}/api/users/:id`, (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  if (id === 1) return c.json({ error: "Cannot delete the bootstrap admin" }, 400);
  deleteUser(id);
  return c.json({ ok: true });
});
```

- [ ] **Step 4: Update bootstrap to create admin user**

Read `server/setup.ts`, after `runMigrations()`, add:

```ts
import { getUserByUsername, createUser } from "./db/queries/users";
import { loadConfig } from "./config";

async function bootstrapAdmin() {
  const existing = getUserByUsername("admin");
  if (existing) return;
  
  const cfg = loadConfig();
  if (cfg.passwordHash) {
    // Migrate password hash from config.json to users table
    const db = new Database(dbPath());
    db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", cfg.passwordHash, "admin");
    db.close();
    console.log("[Bootstrap] Admin user created from existing password hash");
  } else {
    // No password set yet — create admin with empty password (open access)
    const db = new Database(dbPath());
    db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", "", "admin");
    db.close();
    console.log("[Bootstrap] Admin user created (no password — open access)");
  }
}

await bootstrapAdmin();
```

Note: need to import `Database` from "bun:sqlite" and `dbPath` from "./config" at the top.

- [ ] **Step 5: Update client API for multi-user**

Read `client/src/api.ts`, then edit `login` and `checkAuth`:

```ts
login: (username: string, password: string) =>
  fetchJSON<{ ok: boolean; user?: string; role?: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

checkAuth: () =>
  fetchJSON<{ authenticated: boolean; username?: string; role?: string }>("/auth/me"),
```

Add user management methods:

```ts
getUsers: () => fetchJSON<{ users: { id: number; username: string; role: string; created_at: string }[] }>("/users"),
createUser: (data: { username: string; password: string; role?: string }) =>
  fetchJSON("/users", { method: "POST", body: JSON.stringify(data) }),
deleteUser: (id: number, confirmToken: string) =>
  fetchJSON(`/users/${id}`, { method: "DELETE", body: JSON.stringify({ confirmToken }) }),
```

- [ ] **Step 6: Update Login page for username field**

Read `client/src/pages/Login.tsx`, add username input.

- [ ] **Step 7: Commit**

```bash
git add server/auth.ts server/index.ts server/setup.ts client/src/api.ts client/src/pages/Login.tsx
git commit -m "feat: multi-user auth with username/role sessions"
```

---

### Task 8: Multi-user data isolation — owner_id filtering

**Files:**
- Modify: `server/db/queries/accounts.ts` — add ownerId filtering
- Modify: `server/routes/accounts.ts` — pass ownerId from session
- Modify: all routes — enforce ownership or admin visibility

- [ ] **Step 1: Update account queries for owner_id**

In `server/db/queries/accounts.ts`, `getAccounts`:

```ts
export function getAccounts(ownerId?: number): AccountPublic[] {
  const db = getDb();
  const query = db.select({ /* all columns except auth_token */ }).from(accounts);
  if (ownerId !== undefined) {
    return query.where(eq(accounts.owner_id, ownerId)).all() as AccountPublic[];
  }
  return query.all() as AccountPublic[];
}
```

`createAccount` adds `owner_id`:

```ts
export function createAccount(
  screenName: string, authToken: string, fetchInterval: number,
  platform = "twitter", instanceUrl: string | null = null,
  authType: string | null = null, ownerId: number
): AccountRow { ... }
```

- [ ] **Step 2: Update all routes to pass owner context**

In `server/index.ts`, add a helper:

```ts
function getOwnerFilter(c: any): number | undefined {
  if (c.get("sessionRole") === "admin") return undefined; // admin sees all
  // For normal users, we'd need their user ID. For now, session tracks role only.
  // We need to also track userId in the session.
  return c.get("sessionUserId") as number | undefined;
}
```

Update `validateSession` to also return and set `userId`.

- [ ] **Step 3: Add auth middleware userId**

In `server/index.ts`, update the auth middleware to also extract userId from the users table and set it:

```ts
import { getUserByUsername } from "./db/queries/users";
// In auth middleware:
const user = getUserByUsername(sessionUser.username);
if (user) c.set("sessionUserId", user.id);
```

- [ ] **Step 4: Update accounts routes for ownership**

In `server/routes/accounts.ts`:
- `GET /` → filter by `sessionUserId` for non-admins
- `POST /` → `createAccount(..., ownerId = sessionUserId)`
- `DELETE /:id` → verify ownership or admin

- [ ] **Step 5: Commit**

```bash
git add server/db/queries/accounts.ts server/routes/accounts.ts server/index.ts
git commit -m "feat: multi-user data isolation with owner_id filtering"
```

---

### Task 9: Confirmation token system and ConfirmDialog

**Files:**
- Create: `server/routes/confirm.ts` — confirmation token endpoint
- Create: `client/src/components/ui/ConfirmDialog.tsx` — reusable dialog
- Modify: `client/src/pages/RedditDetail.tsx` — wire delete account
- Modify: `client/src/pages/*.tsx` — wire other delete actions

- [ ] **Step 1: Create server/routes/confirm.ts**

```ts
import { Hono } from "hono";
import { randomBytes } from "crypto";

// In-memory token store: token → expiry timestamp
const tokens = new Map<string, number>();

// Clean expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of tokens) {
    if (expiry < now) tokens.delete(token);
  }
}, 60_000);

const confirmRouter = new Hono();

confirmRouter.post("/token", (c) => {
  const token = randomBytes(3).toString("hex").slice(0, 6); // 6-char hex
  tokens.set(token, Date.now() + 5 * 60_000); // 5 min expiry
  return c.json({ token });
});

export function validateConfirmToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry || expiry < Date.now()) return false;
  tokens.delete(token); // one-time use
  return true;
}

export default confirmRouter;
```

- [ ] **Step 2: Register confirm route in server/index.ts**

Add: `app.route(`${BASE}/api/confirm`, confirmRouter);`

- [ ] **Step 3: Add confirmToken validation to account delete route**

In `server/routes/accounts.ts`, `DELETE /:id`:

```ts
accountsRouter.delete("/:id", (c) => {
  const { confirmToken } = c.req.json() as any;
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return c.json({ error: "Invalid or expired confirmation token" }, 400);
  }
  // existing delete logic
});
```

- [ ] **Step 4: Create ConfirmDialog component**

```tsx
// client/src/components/ui/ConfirmDialog.tsx
import { useState, useEffect } from "react";
import { api } from "../../api";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (token: string) => Promise<void>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "删除", onConfirm }: ConfirmDialogProps) {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setInput("");
      setLoading(false);
      api.getConfirmToken().then(({ token }) => setToken(token));
    }
  }, [open]);

  const match = input.toLowerCase() === token.toLowerCase();

  const handleConfirm = async () => {
    if (!match || loading) return;
    setLoading(true);
    try {
      await onConfirm(token);
      onOpenChange(false);
    } catch {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-sm w-full mx-4 shadow-lg">
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">{description}</p>
        <div className="bg-[var(--muted)] rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest select-all mb-4">
          {token}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入上方确认码"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!match || loading}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add API methods for confirm token and update delete**

In `client/src/api.ts`:

```ts
getConfirmToken: () => fetchJSON<{ token: string }>("/confirm/token", { method: "POST" }),
deleteAccount: (id: number, confirmToken: string) =>
  fetchJSON<{ success: boolean }>(`/accounts/${id}`, { method: "DELETE", body: JSON.stringify({ confirmToken }) }),
deleteUser: (id: number, confirmToken: string) =>
  fetchJSON<{ ok: boolean }>(`/users/${id}`, { method: "DELETE", body: JSON.stringify({ confirmToken }) }),
```

- [ ] **Step 6: Commit**

```bash
git add server/routes/confirm.ts server/index.ts client/src/components/ui/ConfirmDialog.tsx client/src/api.ts
git commit -m "feat: confirmation token system and ConfirmDialog component"
```

---

### Task 10: Admin user management UI

**Files:**
- Modify: `client/src/pages/Settings.tsx` — add user management section (admin only)
- Modify: `client/src/locales/zh.json` — add user management i18n keys
- Modify: `client/src/locales/en.json` — add user management i18n keys

- [ ] **Step 1: Add user management section to Settings.tsx**

Read `Settings.tsx`. Add after the security section (before appearance), conditionally shown for admin users:

```tsx
{/* Only show for admin */}
{authData?.role === "admin" && (
  <section className="space-y-4">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <Users size={14} /> {t("settings.userManagement")}
    </h3>
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
      {/* Create user form */}
      <form onSubmit={handleCreateUser} className="flex gap-2">
        <input name="username" placeholder={t("settings.username")} required
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm" />
        <input name="password" type="password" placeholder={t("settings.password")} required
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm" />
        <select name="role" className="px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm">
          <option value="user">{t("settings.roleUser")}</option>
          <option value="admin">{t("settings.roleAdmin")}</option>
        </select>
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm">
          {t("settings.createUser")}
        </button>
      </form>
      {/* User list */}
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between py-1.5 border-t border-[var(--border)]">
          <span className="text-sm">{u.username} <span className="text-[10px] text-[var(--muted-foreground)]">({u.role})</span></span>
          {u.id !== 1 && (
            <button onClick={() => setDeleteUserId(u.id)} className="text-xs text-red-500 hover:underline">
              {t("common.delete")}
            </button>
          )}
        </div>
      ))}
    </div>
    {/* ConfirmDialog for user deletion */}
    <ConfirmDialog
      open={deleteUserId !== null}
      onOpenChange={(v) => { if (!v) setDeleteUserId(null); }}
      title={t("settings.deleteUser")}
      description={t("settings.deleteUserDesc")}
      confirmLabel={t("common.delete")}
      onConfirm={async (token) => {
        if (deleteUserId === null) return;
        await api.deleteUser(deleteUserId, token);
        setDeleteUserId(null);
        refetchUsers();
      }}
    />
  </section>
)}
```

Add state variables at top of Settings:
```tsx
const [users, setUsers] = useState<any[]>([]);
const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
```

Use `useQuery` to get auth data and fetch users:
```tsx
const { data: authData } = useQuery({ queryKey: ["auth", "me"], queryFn: () => api.checkAuth() });
const { data: usersData, refetch: refetchUsers } = useQuery({
  queryKey: ["users"],
  queryFn: () => api.getUsers(),
  enabled: authData?.role === "admin",
});
```

Add `handleCreateUser`:
```tsx
const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const role = form.get("role") as string;
  try {
    await api.createUser({ username, password, role });
    (e.target as HTMLFormElement).reset();
    refetchUsers();
  } catch (err: any) {
    alert(err.message);
  }
};
```

- [ ] **Step 2: Add i18n keys**

In `zh.json`:
```json
"settings.userManagement": "用户管理",
"settings.username": "用户名",
"settings.password": "密码",
"settings.roleUser": "普通用户",
"settings.roleAdmin": "管理员",
"settings.createUser": "创建用户",
"settings.deleteUser": "删除用户",
"settings.deleteUserDesc": "此操作不可撤销，将同时删除该用户的所有数据。请输入上方确认码。"
```

In `en.json`:
```json
"settings.userManagement": "User Management",
"settings.username": "Username",
"settings.password": "Password",
"settings.roleUser": "User",
"settings.roleAdmin": "Admin",
"settings.createUser": "Create User",
"settings.deleteUser": "Delete User",
"settings.deleteUserDesc": "This action cannot be undone. All user data will be deleted. Please type the confirmation code above."
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Settings.tsx client/src/locales/zh.json client/src/locales/en.json
git commit -m "feat: admin user management UI in Settings page"
```

---

### Task 11: Wire ConfirmDialog to all delete actions

**Files:**
- Modify: `client/src/pages/XDetail.tsx` — wire delete account
- Modify: `client/src/pages/GitHubDetail.tsx` — wire delete account
- Modify: `client/src/pages/GitLabDetail.tsx` — wire delete account
- Modify: `client/src/pages/RedditDetail.tsx` — wire delete account

- [ ] **Step 1: Add ConfirmDialog and useApi.deleteAccount to each detail page**

For each detail page, find the delete account button handler and wrap it with ConfirmDialog. Example for RedditDetail.tsx:

Find the delete button and its state. Add:

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

Wrap the delete button's onClick to open the dialog instead of calling delete directly.

Add at bottom of the component:
```tsx
<ConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title={t("common.deleteAccount")}
  description={t("common.deleteAccountDesc")}
  onConfirm={async (token) => {
    await api.deleteAccount(accountId, token);
    navigate("/reddit");
  }}
/>
```

- [ ] **Step 2: Repeat for XDetail, GitHubDetail, GitLabDetail**

Same pattern — each detail page with a delete button gets the ConfirmDialog.

- [ ] **Step 3: Add i18n keys**

```json
"common.deleteAccount": "删除账号",
"common.deleteAccountDesc": "此操作不可撤销，将删除该账号及其所有关联数据。请输入上方确认码。"
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ client/src/locales/
git commit -m "feat: wire ConfirmDialog to all account delete actions"
```

---

### Task 12: Integration testing and cleanup

**Files:**
- No new files

- [ ] **Step 1: Full app test — start server**

```bash
cd /Users/kaoru/Developer/dashboard && bun run server &
sleep 2
curl -s http://localhost:3001/$(cat data/config.json | python3 -c "import sys,json; print(json.load(sys.stdin)['urlPrefix'])")/api/auth/me
```

Expected: `{"authenticated":false}` (or `{"authenticated":true,...}` if session exists)

- [ ] **Step 2: Test login with admin username**

```bash
PREFIX=$(cat data/config.json | python3 -c "import sys,json; print(json.load(sys.stdin)['urlPrefix'])")
# Login
curl -s -X POST http://localhost:3001/$PREFIX/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":""}' -c /tmp/cookies.txt
# Check auth
curl -s http://localhost:3001/$PREFIX/api/auth/me -b /tmp/cookies.txt
```

- [ ] **Step 3: Test user creation**

```bash
curl -s -X POST http://localhost:3001/$PREFIX/api/users \
  -H 'Content-Type: application/json' \
  -b /tmp/cookies.txt \
  -d '{"username":"testuser","password":"test123","role":"user"}'
```

- [ ] **Step 4: Test account listing**

```bash
curl -s http://localhost:3001/$PREFIX/api/accounts -b /tmp/cookies.txt | head -5
```

- [ ] **Step 5: Kill server and commit**

```bash
kill %1
git add -A
git commit -m "chore: final integration fixes and cleanup"
```

---

### Task 13: Remove old migration system and config.json passwordHash

**Files:**
- Modify: `server/config.ts` — remove `passwordHash` field
- Modify: `db/schema.ts` — keep but mark as legacy (or remove initSchema export)
- Modify: `server/index.ts` — remove old password hash references

- [ ] **Step 1: Remove passwordHash from config**

Remove `passwordHash` from `DashboardConfig` interface and `DEFAULTS`. The password is now only in the `users` table.

- [ ] **Step 2: Remove old initSchema call**

In `server/db/connection.ts` or wherever it was called, ensure the old `initSchema` is no longer invoked (Drizzle handles schema via `drizzle-kit push`).

- [ ] **Step 3: Commit**

```bash
git add server/config.ts server/db.ts db/schema.ts
git commit -m "refactor: remove passwordHash from config, use users table exclusively"
```
