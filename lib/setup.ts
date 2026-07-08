// @ts-nocheck — bun:sqlite is Bun-specific, only used for migration
import { join } from "path";
import { existsSync } from "fs";
import { initCrypto, encrypt, decrypt } from "./crypto";
import { loadConfig, loadOrGenerateKey, dataDir } from "./config";
import { initPgPool, getPgPool } from "./db/connection";

// ═══════════════════════════════════════════════════════════════════
// Main entry
// ═══════════════════════════════════════════════════════════════════

export async function bootstrap() {
  // 1. Parse config (DATABASE_URL → PostgreSQL)
  loadConfig();

  // 2. Encryption key
  const key = loadOrGenerateKey();
  initCrypto(key);

  // 3. Connect to PostgreSQL
  try {
    await initPgPool();
  } catch (e: unknown) {
    console.error("❌ PostgreSQL unavailable:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 4. Create missing tables (must run before migration)
  await createMissingTables();

  // 5. Check for SQLite → PG migration
  await autoMigrate();

  // 6. Re-encrypt any tokens that were stored in plaintext
  await reEncryptPlaintextTokens();

  // 7. Bootstrap admin user
  try {
    await bootstrapAdminUser();
  } catch (e: unknown) {
    console.error("❌ Failed to bootstrap admin user:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  console.log("[Bootstrap] Ready");
}

// ═══════════════════════════════════════════════════════════════════
// SQLite auto-migration
// ═══════════════════════════════════════════════════════════════════

async function autoMigrate() {
  const sqlitePath = join(dataDir(), "db", "dashboard.db");
  if (!existsSync(sqlitePath)) {
    console.log("[Migrate] No SQLite data found — fresh start");
    return;
  }

  const pool = getPgPool()!;

  // Check migration status — do it once, never again
  const { rows: flag } = await pool.query(
    `SELECT value FROM settings WHERE key = 'migrated_from_sqlite'`
  );
  if (flag.length > 0) {
    console.log("[Migrate] Already migrated — skipping");
    return;
  }

  console.log("[Migrate] ═══ SQLite detected — starting migration ═══");

  const { Database } = await import("bun:sqlite");
  const src = new Database(sqlitePath);
  src.exec("PRAGMA readonly = ON");

  const tableRows = src.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle_%' ORDER BY name"
  ).all() as { name: string }[];
  const tables = new Set(tableRows.map(r => r.name));

  // Migrate in FK-safe order
  const ORDER = [
    "users", "accounts", "settings",
    "user_stats", "tweets",
    "github_stats", "github_repos", "github_contributions",
    "github_repo_snapshots", "github_traffic_clones", "github_traffic_views",
    "github_referrers", "github_paths", "github_releases", "github_release_assets",
    "gitlab_stats", "gitlab_projects", "gitlab_contributions",
    "gitlab_project_snapshots", "gitlab_releases", "gitlab_release_assets",
    "reddit_stats", "reddit_posts", "reddit_comments",
  ];

  let totalRows = 0;
  let migratedTables = 0;

  for (const table of ORDER) {
    if (!tables.has(table)) continue;

    // Check if PG already has data in this table
    const { rows: pgCount } = await pool.query(`SELECT COUNT(*) as n FROM ${table}`);
    if (Number(pgCount[0].n) > 0) {
      console.log(`[Migrate]   ${table}: already has data, skipping`);
      continue;
    }

    const cols = src.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    const rows = src.query(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    if (rows.length === 0) continue;

    const colQuoted = colNames.map(c => `"${c}"`).join(", ");
    const placeholders = colNames.map((_, i) => `$${i + 1}`).join(", ");
    const insertSQL = `INSERT INTO ${table} (${colQuoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    let inserted = 0;
    for (const row of rows) {
      try {
        await pool.query(insertSQL, colNames.map(c => row[c]));
        inserted++;
      } catch {
        // duplicate, skip
      }
    }

    console.log(`[Migrate]   ${table}: ${inserted}/${rows.length} rows`);
    totalRows += inserted;
    migratedTables++;
  }

  // Reset sequences
  for (const table of ORDER) {
    if (!tables.has(table)) continue;
    const cols = src.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some(c => c.name === "id")) continue;
    const maxRow = src.query(`SELECT MAX(id) as m FROM ${table}`).get() as { m: number } | null;
    const maxId = maxRow?.m || 0;
    if (maxId > 0) {
      try {
        await pool.query(`SELECT setval('${table}_id_seq', $1, true)`, [maxId]);
      } catch { /* sequence may not exist for text-PK tables */ }
    }
  }

  src.close();

  // Mark migration done
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('migrated_from_sqlite', NOW()::text) ON CONFLICT (key) DO NOTHING`
  );

  console.log(`[Migrate] ═══ Done: ${totalRows} rows across ${migratedTables} tables ═══`);
}

// ═══════════════════════════════════════════════════════════════════
// Schema — CREATE TABLE IF NOT EXISTS
// ═══════════════════════════════════════════════════════════════════

const SCHEMA = [
  { table: "users", sql: `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL DEFAULT NOW(), deleted_at TEXT)` },
  { table: "accounts", sql: `CREATE TABLE IF NOT EXISTS accounts (id SERIAL PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), screen_name TEXT NOT NULL, platform TEXT NOT NULL DEFAULT 'twitter', user_id TEXT, auth_token TEXT NOT NULL, fetch_interval INTEGER DEFAULT 30, is_active INTEGER DEFAULT 1, last_fetched_at TEXT, error_message TEXT, instance_url TEXT, auth_type TEXT, created_at TEXT NOT NULL DEFAULT NOW(), updated_at TEXT NOT NULL DEFAULT NOW(), deleted_at TEXT); CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_screen_name_platform ON accounts(owner_id, screen_name, platform)` },
  { table: "settings", sql: `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)` },
  { table: "user_stats", sql: `CREATE TABLE IF NOT EXISTS user_stats (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), followers_count INTEGER NOT NULL, following_count INTEGER NOT NULL, tweet_count INTEGER NOT NULL, listed_count INTEGER DEFAULT 0, recorded_at TEXT NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_user_stats_account_id ON user_stats(account_id); CREATE INDEX IF NOT EXISTS idx_user_stats_recorded_at ON user_stats(recorded_at)` },
  { table: "tweets", sql: `CREATE TABLE IF NOT EXISTS tweets (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), full_text TEXT NOT NULL, created_at TEXT NOT NULL, favorite_count INTEGER DEFAULT 0, retweet_count INTEGER DEFAULT 0, reply_count INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0, bookmark_count INTEGER DEFAULT 0, is_quote INTEGER DEFAULT 0, is_reply INTEGER DEFAULT 0, is_retweet INTEGER DEFAULT 0, media_urls TEXT DEFAULT '[]', urls TEXT DEFAULT '[]', hashtags TEXT DEFAULT '[]', mentions TEXT DEFAULT '[]', lang TEXT DEFAULT '', fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at); CREATE INDEX IF NOT EXISTS idx_tweets_account_id ON tweets(account_id)` },
  { table: "github_stats", sql: `CREATE TABLE IF NOT EXISTS github_stats (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), public_repos INTEGER NOT NULL, public_gists INTEGER DEFAULT 0, followers INTEGER NOT NULL, following INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT NOW())` },
  { table: "github_repos", sql: `CREATE TABLE IF NOT EXISTS github_repos (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, name TEXT NOT NULL, full_name TEXT NOT NULL, description TEXT, language TEXT, stars INTEGER DEFAULT 0, forks INTEGER DEFAULT 0, open_issues INTEGER DEFAULT 0, topics TEXT DEFAULT '[]', homepage TEXT, is_fork INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, pushed_at TEXT, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repos_uniq ON github_repos(account_id, repo_id)` },
  { table: "github_contributions", sql: `CREATE TABLE IF NOT EXISTS github_contributions (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), date TEXT NOT NULL, count INTEGER DEFAULT 0, level INTEGER DEFAULT 0, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_contributions_uniq ON github_contributions(account_id, date)` },
  { table: "github_repo_snapshots", sql: `CREATE TABLE IF NOT EXISTS github_repo_snapshots (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, stars INTEGER NOT NULL, forks INTEGER DEFAULT 0, open_issues INTEGER DEFAULT 0, snapshot_date TEXT NOT NULL); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repo_snapshots_uniq ON github_repo_snapshots(account_id, repo_id, snapshot_date)` },
  { table: "github_traffic_clones", sql: `CREATE TABLE IF NOT EXISTS github_traffic_clones (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, date TEXT NOT NULL, count INTEGER DEFAULT 0, uniques INTEGER DEFAULT 0); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_traffic_clones_uniq ON github_traffic_clones(account_id, repo_id, date)` },
  { table: "github_traffic_views", sql: `CREATE TABLE IF NOT EXISTS github_traffic_views (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, date TEXT NOT NULL, count INTEGER DEFAULT 0, uniques INTEGER DEFAULT 0); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_traffic_views_uniq ON github_traffic_views(account_id, repo_id, date)` },
  { table: "github_referrers", sql: `CREATE TABLE IF NOT EXISTS github_referrers (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, referrer TEXT NOT NULL, count INTEGER DEFAULT 0, uniques INTEGER DEFAULT 0, snapshot_date TEXT NOT NULL DEFAULT CURRENT_DATE); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_referrers_uniq ON github_referrers(account_id, repo_id, referrer, snapshot_date)` },
  { table: "github_paths", sql: `CREATE TABLE IF NOT EXISTS github_paths (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, path TEXT NOT NULL, title TEXT, count INTEGER DEFAULT 0, uniques INTEGER DEFAULT 0, snapshot_date TEXT NOT NULL DEFAULT CURRENT_DATE); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_paths_uniq ON github_paths(account_id, repo_id, path, snapshot_date)` },
  { table: "github_releases", sql: `CREATE TABLE IF NOT EXISTS github_releases (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), repo_id INTEGER NOT NULL, release_id INTEGER NOT NULL, tag_name TEXT, name TEXT, body TEXT, prerelease INTEGER DEFAULT 0, published_at TEXT, html_url TEXT, total_downloads INTEGER DEFAULT 0, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_github_releases_uniq ON github_releases(account_id, repo_id, release_id)` },
  { table: "github_release_assets", sql: `CREATE TABLE IF NOT EXISTS github_release_assets (id SERIAL PRIMARY KEY, release_id INTEGER NOT NULL REFERENCES github_releases(id), name TEXT NOT NULL, download_count INTEGER DEFAULT 0, size INTEGER DEFAULT 0, content_type TEXT, browser_download_url TEXT)` },
  { table: "gitlab_stats", sql: `CREATE TABLE IF NOT EXISTS gitlab_stats (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), public_projects INTEGER DEFAULT 0, followers INTEGER NOT NULL, following INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT NOW())` },
  { table: "gitlab_projects", sql: `CREATE TABLE IF NOT EXISTS gitlab_projects (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), project_id INTEGER NOT NULL, name TEXT NOT NULL, path_with_namespace TEXT NOT NULL, description TEXT, language TEXT, stars INTEGER DEFAULT 0, forks INTEGER DEFAULT 0, open_issues INTEGER DEFAULT 0, topics TEXT DEFAULT '[]', homepage TEXT, is_fork INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, visibility TEXT DEFAULT 'public', created_at TEXT, updated_at TEXT, last_activity_at TEXT, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_projects_uniq ON gitlab_projects(account_id, project_id)` },
  { table: "gitlab_project_snapshots", sql: `CREATE TABLE IF NOT EXISTS gitlab_project_snapshots (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), project_id INTEGER NOT NULL, stars INTEGER NOT NULL, forks INTEGER DEFAULT 0, open_issues INTEGER DEFAULT 0, snapshot_date TEXT NOT NULL); CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_project_snapshots_uniq ON gitlab_project_snapshots(account_id, project_id, snapshot_date)` },
  { table: "gitlab_releases", sql: `CREATE TABLE IF NOT EXISTS gitlab_releases (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), project_id INTEGER NOT NULL, release_tag TEXT NOT NULL, name TEXT, description TEXT, released_at TEXT, created_at TEXT, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_releases_uniq ON gitlab_releases(account_id, project_id, release_tag)` },
  { table: "gitlab_release_assets", sql: `CREATE TABLE IF NOT EXISTS gitlab_release_assets (id SERIAL PRIMARY KEY, release_id INTEGER NOT NULL REFERENCES gitlab_releases(id), name TEXT NOT NULL, download_count INTEGER DEFAULT 0, size INTEGER DEFAULT 0, file_type TEXT, url TEXT)` },
  { table: "gitlab_contributions", sql: `CREATE TABLE IF NOT EXISTS gitlab_contributions (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), date TEXT NOT NULL, count INTEGER DEFAULT 0, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_contributions_uniq ON gitlab_contributions(account_id, date)` },
  { table: "reddit_stats", sql: `CREATE TABLE IF NOT EXISTS reddit_stats (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), post_karma INTEGER NOT NULL, comment_karma INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_reddit_stats_account_id ON reddit_stats(account_id)` },
  { table: "reddit_posts", sql: `CREATE TABLE IF NOT EXISTS reddit_posts (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), title TEXT NOT NULL, selftext TEXT NOT NULL DEFAULT '', subreddit TEXT NOT NULL, score INTEGER DEFAULT 0, upvote_ratio DOUBLE PRECISION DEFAULT 0, num_comments INTEGER DEFAULT 0, permalink TEXT NOT NULL, url TEXT DEFAULT '', is_self INTEGER DEFAULT 0, created_utc INTEGER NOT NULL, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_reddit_posts_account_id ON reddit_posts(account_id); CREATE INDEX IF NOT EXISTS idx_reddit_posts_created_utc ON reddit_posts(created_utc)` },
  { table: "reddit_comments", sql: `CREATE TABLE IF NOT EXISTS reddit_comments (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), body TEXT NOT NULL, subreddit TEXT NOT NULL, score INTEGER DEFAULT 0, link_id TEXT NOT NULL, parent_id TEXT, depth INTEGER DEFAULT 0, permalink TEXT NOT NULL, created_utc INTEGER NOT NULL, is_submitter INTEGER DEFAULT 0, fetched_at TEXT NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_reddit_comments_account_id ON reddit_comments(account_id)` },
];

async function createMissingTables(): Promise<void> {
  const pool = getPgPool()!;
  const { rows: existing } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const existingSet = new Set(existing.map((r: { table_name: string }) => r.table_name));
  const created: string[] = [];
  for (const { table, sql } of SCHEMA) {
    if (!existingSet.has(table)) {
      await pool.query(sql);
      created.push(table);
    }
  }
  if (created.length > 0) {
    console.log(`[Bootstrap] Created ${created.length} table(s): ${created.join(", ")}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Admin user
// ═══════════════════════════════════════════════════════════════════

async function bootstrapAdminUser(): Promise<void> {
  const pool = getPgPool()!;
  const cfg = loadConfig();

  const { rows } = await pool.query(
    "SELECT id FROM users WHERE username = 'admin' AND deleted_at IS NULL"
  );
  if (rows.length > 0) return;

  // Use the same npm argon2 package that login verification uses
  // (lib/auth.ts verifyPassword). `bun`'s argon2 is not available in the
  // production Node container, which previously made bootstrap throw.
  const argon2 = await import("argon2");

  let pwHash: string;
  let generated: string | null = null;

  if (cfg.passwordHash) {
    pwHash = cfg.passwordHash;
  } else {
    const { randomBytes } = await import("crypto");
    generated = randomBytes(12).toString("base64url");
    pwHash = await argon2.hash(generated);
  }

  await pool.query(
    "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
    ["admin", pwHash, "admin"]
  );

  if (generated) {
    const protocol = cfg.https ? "https" : "http";
    const host = cfg.host;
    const port = cfg.port;
    const url = `${protocol}://${host}${port === 443 || port === 80 ? "" : `:${port}`}/login`;

    console.log("");
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  🔐  Initial admin password                         ║");
    console.log("║     Change it after your first login.               ║");
    console.log("║                                                      ║");
    console.log(`║  Username: admin                                     ║`);
    console.log(`║  Password: ${generated.padEnd(41)}║`);
    console.log("║                                                      ║");
    console.log(`║  Login:   ${url.padEnd(43)}║`);
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log("");
  }
}

// ═══════════════════════════════════════════════════════════════════
// Re-encrypt plaintext auth tokens (backwards compatibility)
// ═══════════════════════════════════════════════════════════════════

async function reEncryptPlaintextTokens(): Promise<void> {
  const pool = getPgPool()!;
  const { rows } = await pool.query(
    "SELECT id, screen_name, platform, auth_token FROM accounts WHERE deleted_at IS NULL"
  );

  let fixed = 0;
  for (const row of rows) {
    try {
      decrypt(row.auth_token);
    } catch {
      const encrypted = encrypt(row.auth_token);
      await pool.query("UPDATE accounts SET auth_token = $1 WHERE id = $2", [encrypted, row.id]);
      console.log(`[Bootstrap] Re-encrypted token for ${row.platform}:${row.screen_name} (id=${row.id})`);
      fixed++;
    }
  }

  if (fixed > 0) {
    console.log(`[Bootstrap] Re-encrypted ${fixed} plaintext token(s)`);
  }
}
