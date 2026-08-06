# Issues

Known bugs, regressions, and code review findings.

> Note: entries below marked as historical happened during the SQLite/Next.js era. The current stack is PostgreSQL + React Router 7 Framework Mode — see [ARCHITECTURE.md](ARCHITECTURE.md).

## Fixed

### Mixed DB access layers (fixed 2026-06-10, historical)

Query functions for Twitter/GitHub/GitLab/Reddit used raw `bun:sqlite` (`rawDb()`) creating new connections per call with string-concatenated SQL, while accounts/users/settings used the Drizzle ORM singleton. Two parallel DB access paths, with SQL injection risk from `accountIds.join(",")`.

**Fix**: Rewrote all query files to use Drizzle Query Builder, eliminated `rawDb()` (58 call sites) and `new Database()` (7 call sites). All SQL now uses parameterized queries.

### Hard delete → soft delete (fixed 2026-06-10)

`deleteAccount` and `deleteUser` actually DELETEd all related data (tweets, repos, etc.), making recovery impossible.

**Fix**:
- Added `deleted_at` column to `accounts` and `users`
- `deleteAccount` → `UPDATE accounts SET deleted_at = NOW()`
- `deleteUser` → soft-delete user + all linked accounts
- List queries default to `WHERE deleted_at IS NULL`

### Residual raw SQL in fetchers (fixed 2026-06-10, historical)

`lib/fetchers/github.ts` `fetchRepoReleases` used `getDb().prepare()` / `getDb().query()` with raw SQL, inconsistent with the Drizzle approach used elsewhere.

**Fix**: Switched to `upsertGithubRelease()` + Drizzle select.

### React async event `currentTarget` null (fixed 2026-06-10)

`app/(dashboard)/admin/page.tsx` and `app/(dashboard)/settings/page.tsx` called `e.currentTarget.reset()` after `await` in async event handlers. React synthetic events nullify `currentTarget` once the handler's synchronous execution completes.

**Fix**: Captured `formElement = e.currentTarget` before `await`.

### Drizzle `returning()` with `@libsql/client` (fixed 2026-06-10, historical)

`createUser` used `.returning()` which generated INSERT statements with all columns listed explicitly, including `id = null`. The `@libsql/client` driver threw "Failed query" on this pattern.

**Fix**: Replaced `.returning()` with direct `getClient().execute()` using raw SQL. Also added soft-delete user revive logic to handle UNIQUE constraint on re-creation. (Current stack uses `pg`; `@libsql/client` is gone.)

### Missing `await` on DB writes (fixed 2026-06-10)

Various calls to `deleteUser`, `deleteAccount`, `updateAccount`, `insertUserStats`, `upsertTweet`, etc. were missing `await`, causing silent failures.

**Fix**: Added `await` to all async DB write calls across route handlers and fetchers.

### Zero test coverage (fixed 2026-06-14)

No test files existed. Added test suite covering auth, crypto, and database query operations.

**Fix**: Created `tests/` with `auth.test.ts`, `crypto.test.ts`, `db-queries.test.ts` (later expanded).

### No structured logging (fixed 2026-06-14)

Only `console.log` / `console.error` throughout the project.

**Fix**: Added `lib/logger.ts` with file-based logging, rotation, configurable levels.

### Fetcher hardening (fixed 2026-06-14)

All four platform fetchers lacked request timeouts, concurrency guards, and progress logging.

**Fix**: Added 30s timeouts, per-platform `Set<number>` concurrency guards, progress logging, and batch upserts for contribution records.

### Duplicate client type declarations (fixed)

`lib/api.ts` had ~250 lines of interface definitions duplicating server schema types.

**Fix**: Types now live in `shared/types.ts` and are re-exported from `lib/api.ts`; no duplication.

### GraphQL string interpolation (fixed)

`lib/fetchers/github.ts` interpolated `${username}` into a GraphQL query string.

**Fix**: The contribution-calendar query now uses GraphQL variables (`query($login: String!, …)`).

### `ownerId` default is 1 (fixed)

`createAccount()` previously defaulted `ownerId = 1` (admin-first assumption).

**Fix**: `createAccount` now requires `owner_id` explicitly; the route layer always passes the authenticated user's ID.

### Vite plugin hack (fixed)

`client/vite.config.ts` `suppressBaseHintPlugin()` monkey-patched Vite internals at runtime.

**Fix**: The plugin is gone. `vite.config.ts` now only wires `tailwindcss()` + `reactRouter()` and the `NEXT_PUBLIC_MOCK_DATA` build-time define.

### Low theme variety (fixed)

Only 2 dark themes, visually near-identical.

**Fix**: `lib/client/themes.ts` now ships 12 themes (6 light + 6 dark: default, sepia, cyber, forest, sky, rose).

### i18n gaps (fixed)

`Overview.tsx` referenced `redditDetail.noData` which may not exist in all locale files.

**Fix**: `redditDetail.*` keys (including `noData`) exist in both `locales/en.json` and `locales/zh.json`.

## Open

### High

#### 1. Session token in cleartext (mitigated)

Cookie (`dash_session`) contains a JWT (HS256) signed token, but the payload (`sub` = username, `role`) is readable if not encrypted. No `__Host-` prefix. `Secure` flag only set when `HTTPS=true`. Should consider encrypted JWT or server-stored sessions.

### Medium

#### 2. No HTTP-level retry on GitHub/GitLab/Reddit fetchers

All platforms retry transport-level failures (`withNetworkRetry` in `lib/http.ts`), and the X fetcher retries on 429. GitHub/GitLab/Reddit still throw immediately on HTTP status errors (429/5xx) instead of honoring `Retry-After` / backoff.

#### 3. Incomplete rate limiting

Only the login endpoint has in-memory rate limiting (10/min/IP), which resets on restart. No other API endpoints are rate-limited.

### Low

#### 4. Fetcher runs in main process

Scheduler runs in-process via `startScheduler()` (`lib/scheduler.ts`). Heavy fetcher loads may block API responses.

#### 5. Confirmation tokens are in-memory

`lib/confirm-helpers.ts` keeps tokens in a process-local `Map`; tokens are lost on restart and do not work across multiple instances.
