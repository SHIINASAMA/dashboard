import { Database } from "bun:sqlite";
import { dbPath, loadConfig } from "../server/config";

function ensureColumn(db: Database, table: string, column: string, type: string, sqliteDef?: string) {
  const cols = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    const def = sqliteDef ?? type;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    console.log(`[Migration] Added ${column} to ${table}`);
  }
}

function ensureIndexes(db: Database) {
  const indexList = (db.query("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[]).map(r => r.name);
  const indexes: [string, string][] = [
    ["idx_accounts_owner_id", "CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id)"],
    ["idx_tweets_created_at", "CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at)"],
    ["idx_tweets_account_id", "CREATE INDEX IF NOT EXISTS idx_tweets_account_id ON tweets(account_id)"],
    ["idx_user_stats_account_id", "CREATE INDEX IF NOT EXISTS idx_user_stats_account_id ON user_stats(account_id)"],
    ["idx_user_stats_recorded_at", "CREATE INDEX IF NOT EXISTS idx_user_stats_recorded_at ON user_stats(recorded_at)"],
    ["idx_reddit_stats_account_id", "CREATE INDEX IF NOT EXISTS idx_reddit_stats_account_id ON reddit_stats(account_id)"],
    ["idx_reddit_posts_account_id", "CREATE INDEX IF NOT EXISTS idx_reddit_posts_account_id ON reddit_posts(account_id)"],
    ["idx_reddit_posts_created_utc", "CREATE INDEX IF NOT EXISTS idx_reddit_posts_created_utc ON reddit_posts(created_utc)"],
    ["idx_reddit_comments_account_id", "CREATE INDEX IF NOT EXISTS idx_reddit_comments_account_id ON reddit_comments(account_id)"],
    // Unique indexes required by onConflictDoUpdate
    ["idx_github_repos_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repos_uniq ON github_repos(account_id, repo_id)"],
    ["idx_github_contributions_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_contributions_uniq ON github_contributions(account_id, date)"],
    ["idx_github_repo_snapshots_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repo_snapshots_uniq ON github_repo_snapshots(account_id, repo_id, snapshot_date)"],
    ["idx_github_traffic_clones_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_traffic_clones_uniq ON github_traffic_clones(account_id, repo_id, date)"],
    ["idx_github_traffic_views_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_traffic_views_uniq ON github_traffic_views(account_id, repo_id, date)"],
    ["idx_github_referrers_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_referrers_uniq ON github_referrers(account_id, repo_id, referrer, snapshot_date)"],
    ["idx_github_paths_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_paths_uniq ON github_paths(account_id, repo_id, path, snapshot_date)"],
    ["idx_github_releases_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_github_releases_uniq ON github_releases(account_id, repo_id, release_id)"],
    ["idx_gitlab_projects_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_projects_uniq ON gitlab_projects(account_id, project_id)"],
    ["idx_gitlab_contributions_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_contributions_uniq ON gitlab_contributions(account_id, date)"],
    ["idx_gitlab_project_snapshots_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_project_snapshots_uniq ON gitlab_project_snapshots(account_id, project_id, snapshot_date)"],
    ["idx_gitlab_releases_uniq", "CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_releases_uniq ON gitlab_releases(account_id, project_id, release_tag)"],
  ];
  for (const [name, sql] of indexes) {
    if (!indexList.includes(name)) {
      db.exec(sql);
      console.log(`[Migration] Created ${name}`);
    }
  }
}

export function runMigrations() {
  const db = new Database(dbPath());
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");

  // Run these every time (idempotent)
  ensureColumn(db, "accounts", "owner_id", "INTEGER REFERENCES users(id)");
  ensureColumn(db, "accounts", "deleted_at", "TEXT");
  ensureColumn(db, "users", "deleted_at", "TEXT");
  ensureColumn(db, "gitlab_contributions", "fetched_at", "TEXT");
  db.exec("UPDATE accounts SET owner_id = 1 WHERE owner_id IS NULL");

  // Create/update indexes every time (idempotent with IF NOT EXISTS)
  ensureIndexes(db);

  const hasUsers = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (hasUsers) {
    console.log("[Migration] users table already exists, skipping create");
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

  console.log("[Migration] Complete");
  db.close();
}
