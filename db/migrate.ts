import { Database } from "bun:sqlite";
import { dbPath, loadConfig } from "../server/config";

export function runMigrations() {
  const db = new Database(dbPath());
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");

  const hasUsers = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (hasUsers) {
    console.log("[Migration] users table already exists, skipping");
    // Still fix up NULL owner_ids even when users table already exists
    db.exec("UPDATE accounts SET owner_id = 1 WHERE owner_id IS NULL");
    db.close();
    return;
  }

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add owner_id to accounts if missing
  const cols = db.query("PRAGMA table_info(accounts)").all() as { name: string }[];
  if (!cols.some(c => c.name === "owner_id")) {
    db.exec("ALTER TABLE accounts ADD COLUMN owner_id INTEGER REFERENCES users(id)");
  }
  // Update NULL owner_ids to 1 (bootstrap admin)
  db.exec("UPDATE accounts SET owner_id = 1 WHERE owner_id IS NULL");

  // Settings table (v11 migration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Bootstrap admin user from config password hash
  const cfg = loadConfig();
  if (cfg.passwordHash) {
    db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", cfg.passwordHash, "admin");
    console.log("[Migration] Admin user created from existing password hash");
  } else {
    db.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", "", "admin");
    console.log("[Migration] Admin user created (no password — open access)");
  }

  // Ensure all missing indexes exist
  const indexList = (db.query("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[]).map(r => r.name);
  const indexes: [string, string][] = [
    ["idx_accounts_owner_id", "CREATE INDEX idx_accounts_owner_id ON accounts(owner_id)"],
    ["idx_tweets_created_at", "CREATE INDEX idx_tweets_created_at ON tweets(created_at)"],
    ["idx_tweets_account_id", "CREATE INDEX idx_tweets_account_id ON tweets(account_id)"],
    ["idx_user_stats_account_id", "CREATE INDEX idx_user_stats_account_id ON user_stats(account_id)"],
    ["idx_user_stats_recorded_at", "CREATE INDEX idx_user_stats_recorded_at ON user_stats(recorded_at)"],
    ["idx_reddit_stats_account_id", "CREATE INDEX idx_reddit_stats_account_id ON reddit_stats(account_id)"],
    ["idx_reddit_posts_account_id", "CREATE INDEX idx_reddit_posts_account_id ON reddit_posts(account_id)"],
    ["idx_reddit_posts_created_utc", "CREATE INDEX idx_reddit_posts_created_utc ON reddit_posts(created_utc)"],
    ["idx_reddit_comments_account_id", "CREATE INDEX idx_reddit_comments_account_id ON reddit_comments(account_id)"],
  ];
  for (const [name, sql] of indexes) {
    if (!indexList.includes(name)) {
      db.exec(sql);
    }
  }

  console.log("[Migration] Complete");
  db.close();
}
