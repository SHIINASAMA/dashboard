import { Database } from "bun:sqlite";

/**
 * Migration system:
 * - `_migrations` table tracks which migrations have been applied
 * - Each migration is a versioned function
 * - New migrations are appended, never modifying existing ones
 * - NEVER delete or modify a migration once committed
 */

const MIGRATIONS: { version: number; name: string; up: (db: Database) => void }[] = [
  // ── Migration 1: initial schema ──────────────────────────────
  {
    version: 1,
    name: "initial schema",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          screen_name TEXT NOT NULL,
          platform TEXT NOT NULL DEFAULT 'twitter',
          user_id TEXT,
          auth_token TEXT NOT NULL,
          fetch_interval INTEGER DEFAULT 30,
          is_active INTEGER DEFAULT 1,
          last_fetched_at TEXT,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(screen_name, platform)
        );

        CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          followers_count INTEGER NOT NULL,
          following_count INTEGER NOT NULL,
          tweet_count INTEGER NOT NULL,
          listed_count INTEGER DEFAULT 0,
          recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        );

        CREATE TABLE IF NOT EXISTS tweets (
          id TEXT PRIMARY KEY,
          account_id INTEGER NOT NULL,
          full_text TEXT NOT NULL,
          created_at TEXT NOT NULL,
          favorite_count INTEGER DEFAULT 0,
          retweet_count INTEGER DEFAULT 0,
          reply_count INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          bookmark_count INTEGER DEFAULT 0,
          is_quote INTEGER DEFAULT 0,
          is_reply INTEGER DEFAULT 0,
          is_retweet INTEGER DEFAULT 0,
          media_urls TEXT DEFAULT '[]',
          urls TEXT DEFAULT '[]',
          hashtags TEXT DEFAULT '[]',
          mentions TEXT DEFAULT '[]',
          lang TEXT DEFAULT '',
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        );

        CREATE TABLE IF NOT EXISTS github_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          public_repos INTEGER NOT NULL,
          public_gists INTEGER DEFAULT 0,
          followers INTEGER NOT NULL,
          following INTEGER NOT NULL,
          recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        );

        CREATE TABLE IF NOT EXISTS github_repos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT NOT NULL,
          description TEXT,
          language TEXT,
          stars INTEGER DEFAULT 0,
          forks INTEGER DEFAULT 0,
          open_issues INTEGER DEFAULT 0,
          topics TEXT DEFAULT '[]',
          homepage TEXT,
          is_fork INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT,
          pushed_at TEXT,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(account_id, repo_id),
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        );

        CREATE TABLE IF NOT EXISTS github_contributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          level INTEGER DEFAULT 0,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(account_id, date),
          FOREIGN KEY (account_id) REFERENCES accounts(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at);
        CREATE INDEX IF NOT EXISTS idx_tweets_account_id ON tweets(account_id);
        CREATE INDEX IF NOT EXISTS idx_user_stats_account_id ON user_stats(account_id);
        CREATE INDEX IF NOT EXISTS idx_user_stats_recorded_at ON user_stats(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_github_stats_account_id ON github_stats(account_id);
        CREATE INDEX IF NOT EXISTS idx_github_repos_account_id ON github_repos(account_id);
        CREATE INDEX IF NOT EXISTS idx_github_contributions_account_id ON github_contributions(account_id);
      `);
    },
  },

  // ── Migration 2: repo insights tables ─────────────────────────
  {
    version: 2,
    name: "repo insight tables",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS github_repo_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          stars INTEGER NOT NULL,
          forks INTEGER DEFAULT 0,
          open_issues INTEGER DEFAULT 0,
          snapshot_date TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, snapshot_date)
        );

        CREATE TABLE IF NOT EXISTS github_traffic_clones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          uniques INTEGER DEFAULT 0,
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, date)
        );

        CREATE TABLE IF NOT EXISTS github_traffic_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          uniques INTEGER DEFAULT 0,
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, date)
        );

        CREATE TABLE IF NOT EXISTS github_referrers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          referrer TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          uniques INTEGER DEFAULT 0,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, referrer)
        );

        CREATE TABLE IF NOT EXISTS github_paths (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          path TEXT NOT NULL,
          title TEXT,
          count INTEGER DEFAULT 0,
          uniques INTEGER DEFAULT 0,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, path)
        );

        CREATE TABLE IF NOT EXISTS github_releases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          repo_id INTEGER NOT NULL,
          release_id INTEGER NOT NULL,
          tag_name TEXT,
          name TEXT,
          body TEXT,
          prerelease INTEGER DEFAULT 0,
          published_at TEXT,
          html_url TEXT,
          total_downloads INTEGER DEFAULT 0,
          fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          UNIQUE(account_id, repo_id, release_id)
        );

        CREATE TABLE IF NOT EXISTS github_release_assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          release_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          download_count INTEGER DEFAULT 0,
          size INTEGER DEFAULT 0,
          content_type TEXT,
          browser_download_url TEXT,
          FOREIGN KEY (release_id) REFERENCES github_releases(id)
        );

        CREATE INDEX IF NOT EXISTS idx_github_traffic_clones_repo ON github_traffic_clones(account_id, repo_id);
        CREATE INDEX IF NOT EXISTS idx_github_traffic_views_repo ON github_traffic_views(account_id, repo_id);
        CREATE INDEX IF NOT EXISTS idx_github_repo_snapshots_repo ON github_repo_snapshots(account_id, repo_id);
        CREATE INDEX IF NOT EXISTS idx_github_releases_repo ON github_releases(account_id, repo_id);
      `);
    },
  },

  // ── Migration 3: normalize tweet created_at to ISO 8601 ──────────
  {
    version: 3,
    name: "normalize tweet created_at to ISO 8601",
    up(db) {
      const rows = db.query("SELECT id, created_at FROM tweets").all() as { id: string; created_at: string }[];
      const stmt = db.prepare("UPDATE tweets SET created_at = ? WHERE id = ?");
      for (const row of rows) {
        try {
          const iso = new Date(row.created_at).toISOString();
          stmt.run(iso, row.id);
        } catch {
          // keep original if parsing fails
        }
      }
    },
  },

  // ── Migration 4: add pinned column to github_repos ──────────────
  {
    version: 4,
    name: "add pinned column to github_repos",
    up(db) {
      db.exec("ALTER TABLE github_repos ADD COLUMN pinned INTEGER DEFAULT 0");
    },
  },
];

export function initSchema(db: Database) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");

  // Ensure _migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Run pending migrations
  const applied = new Set(
    (db.query("SELECT version FROM _migrations").all() as { version: number }[]).map((r) => r.version)
  );

  for (const m of MIGRATIONS) {
    if (!applied.has(m.version)) {
      console.log(`[Migration] Applying v${m.version}: ${m.name}`);
      db.exec("BEGIN");
      try {
        m.up(db);
        db.query("INSERT INTO _migrations (version, name) VALUES (?, ?)").run(m.version, m.name);
        db.exec("COMMIT");
        console.log(`[Migration] v${m.version} applied`);
      } catch (e) {
        db.exec("ROLLBACK");
        console.error(`[Migration] v${m.version} failed:`, e);
        throw e;
      }
    }
  }
}
