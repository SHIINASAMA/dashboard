# Database

SQLite database at `data/db/dashboard.db`. Accessed via Drizzle ORM with `@libsql/client`.

## Schema Files

All Drizzle ORM schemas live in `db/schema/`:

| File | Tables |
|------|--------|
| `users.ts` | `users` |
| `accounts.ts` | `accounts` |
| `twitter.ts` | `tweets`, `user_stats` |
| `github.ts` | `github_stats`, `github_repos`, `github_repo_snapshots`, `github_traffic_clones`, `github_traffic_views`, `github_referrers`, `github_paths`, `github_releases`, `github_release_assets`, `github_contributions` |
| `gitlab.ts` | `gitlab_stats`, `gitlab_projects`, `gitlab_project_snapshots`, `gitlab_releases`, `gitlab_release_assets`, `gitlab_contributions` |
| `reddit.ts` | `reddit_stats`, `reddit_posts`, `reddit_comments` |
| `settings.ts` | `settings` |

Legacy migration system: `db/schema.legacy.ts` (reference only, not used for new tables).

## Migrations

### One-shot (`db/migrate.ts`)

Run automatically via `bootstrap()` in `server/setup.ts`. Handles:

- Creating `users` table (if not exists)
- Adding `owner_id` column to `accounts`
- Adding `deleted_at` to `accounts` and `users`
- Bootstrapping admin user from `data/config.json` password hash

### Adding a new table

1. Create a Drizzle schema file in `db/schema/`
2. Export from `db/schema/index.ts`
3. If the table needs to be created in existing databases, add a migration to `db/migrate.ts`

## Key Conventions

- **AUTOINCREMENT** on `id` columns via `integer("id").primaryKey({ autoIncrement: true })`
- **Timestamps** use `text` type with `default("(datetime('now'))")`
- **Soft-delete** via nullable `deleted_at` text column
- **Unique constraints** on per-platform natural keys (e.g. `account_id + tweet_id`, `account_id + repo_id`)
- **PRAGMA `journal_mode = WAL`** for better concurrent read/write performance

## Multi-User Isolation

The `owner_id` column on `accounts` links to `users.id`. All account queries filter by `owner_id` for non-admin users. Admin users (role=`admin`) see all accounts.

## Soft-Delete Pattern

```sql
-- Delete: mark as deleted
UPDATE users SET deleted_at = datetime('now') WHERE id = ?;

-- List: exclude deleted
SELECT * FROM users WHERE deleted_at IS NULL;

-- Revive: clear deleted_at
UPDATE users SET deleted_at = NULL WHERE id = ?;
```

`getUserByUsername` and `getUserById` both filter with `deleted_at IS NULL`. Reviving a soft-deleted user on re-creation is handled in `createUser()`.
