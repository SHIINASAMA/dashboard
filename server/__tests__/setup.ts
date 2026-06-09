import { initTestDb, getClient } from "../db/connection";
import { initCrypto } from "../crypto";

export async function setupTestDb() {
  initCrypto("a".repeat(64)); // deterministic key for testing
  await initTestDb();

  const client = getClient();
  await client.execute("PRAGMA foreign_keys = OFF");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id) DEFAULT 1,
      screen_name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'twitter',
      user_id TEXT,
      auth_token TEXT NOT NULL DEFAULT '',
      fetch_interval INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      last_fetched_at TEXT,
      error_message TEXT,
      instance_url TEXT,
      auth_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      followers_count INTEGER NOT NULL,
      following_count INTEGER NOT NULL,
      tweet_count INTEGER NOT NULL,
      listed_count INTEGER DEFAULT 0,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tweets (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
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
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      public_repos INTEGER NOT NULL,
      public_gists INTEGER DEFAULT 0,
      followers INTEGER NOT NULL,
      following INTEGER NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
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
      pinned INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      pushed_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_repo_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      forks INTEGER DEFAULT 0,
      open_issues INTEGER DEFAULT 0,
      snapshot_date TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_traffic_clones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      uniques INTEGER DEFAULT 0
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_traffic_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      uniques INTEGER DEFAULT 0
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_referrers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      referrer TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      uniques INTEGER DEFAULT 0,
      snapshot_date TEXT NOT NULL DEFAULT (date('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      title TEXT,
      count INTEGER DEFAULT 0,
      uniques INTEGER DEFAULT 0,
      snapshot_date TEXT NOT NULL DEFAULT (date('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      repo_id INTEGER NOT NULL,
      release_id INTEGER NOT NULL,
      tag_name TEXT,
      name TEXT,
      body TEXT,
      prerelease INTEGER DEFAULT 0,
      published_at TEXT,
      html_url TEXT,
      total_downloads INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS github_release_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL REFERENCES github_releases(id),
      name TEXT NOT NULL,
      download_count INTEGER DEFAULT 0,
      size INTEGER DEFAULT 0,
      content_type TEXT,
      browser_download_url TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      public_projects INTEGER DEFAULT 0,
      followers INTEGER NOT NULL,
      following INTEGER NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      path_with_namespace TEXT NOT NULL,
      description TEXT,
      language TEXT,
      stars INTEGER DEFAULT 0,
      forks INTEGER DEFAULT 0,
      open_issues INTEGER DEFAULT 0,
      topics TEXT DEFAULT '[]',
      homepage TEXT,
      is_fork INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'public',
      created_at TEXT,
      updated_at TEXT,
      last_activity_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_project_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      project_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      forks INTEGER DEFAULT 0,
      open_issues INTEGER DEFAULT 0,
      snapshot_date TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      project_id INTEGER NOT NULL,
      release_tag TEXT NOT NULL,
      name TEXT,
      description TEXT,
      released_at TEXT,
      created_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gitlab_release_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL REFERENCES gitlab_releases(id),
      name TEXT NOT NULL,
      download_count INTEGER DEFAULT 0,
      size INTEGER DEFAULT 0,
      file_type TEXT,
      url TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS reddit_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      post_karma INTEGER NOT NULL,
      comment_karma INTEGER NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS reddit_posts (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      title TEXT NOT NULL,
      selftext TEXT NOT NULL DEFAULT '',
      subreddit TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      upvote_ratio REAL DEFAULT 0,
      num_comments INTEGER DEFAULT 0,
      permalink TEXT NOT NULL,
      url TEXT DEFAULT '',
      is_self INTEGER DEFAULT 0,
      created_utc INTEGER NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS reddit_comments (
      id TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      body TEXT NOT NULL,
      subreddit TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      link_id TEXT NOT NULL,
      parent_id TEXT,
      depth INTEGER DEFAULT 0,
      permalink TEXT NOT NULL,
      created_utc INTEGER NOT NULL,
      is_submitter INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute("PRAGMA foreign_keys = ON");

  // Create unique indexes needed by upsert operations
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_github_contributions_uniq ON github_contributions(account_id, date)");
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_contributions_uniq ON gitlab_contributions(account_id, date)");
  // github_repos unique constraint (account_id, repo_id)
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repos_uniq ON github_repos(account_id, repo_id)");
  // gitlab_projects unique constraint (account_id, project_id)
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_gitlab_projects_uniq ON gitlab_projects(account_id, project_id)");
}
