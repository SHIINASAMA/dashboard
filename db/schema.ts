import { Database } from "bun:sqlite";

export function initSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screen_name TEXT NOT NULL UNIQUE,
      user_id TEXT,
      auth_token TEXT NOT NULL,
      fetch_interval INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      last_fetched_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

    CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at);
    CREATE INDEX IF NOT EXISTS idx_tweets_account_id ON tweets(account_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_account_id ON user_stats(account_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_recorded_at ON user_stats(recorded_at);
  `);
}
