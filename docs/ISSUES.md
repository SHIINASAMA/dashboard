# Issues

Known bugs, regressions, and code review findings.

## Fixed

### Mixed DB access layers (fixed 2026-06-10)

Query functions for Twitter/GitHub/GitLab/Reddit used raw `bun:sqlite` (`rawDb()`) creating new connections per call with string-concatenated SQL, while accounts/users/settings used the Drizzle ORM singleton. Two parallel DB access paths, with SQL injection risk from `accountIds.join(",")`.

**Fix**: Rewrote all query files to use Drizzle Query Builder, eliminated `rawDb()` (58 call sites) and `new Database()` (7 call sites). All SQL now uses parameterized queries.

### Hard delete → soft delete (fixed 2026-06-10)

`deleteAccount` and `deleteUser` actually DELETEd all related data (tweets, repos, etc.), making recovery impossible.

**Fix**:
- Added `deleted_at` column to `accounts` and `users`
- `deleteAccount` → `UPDATE accounts SET deleted_at = datetime('now')`
- `deleteUser` → soft-delete user + all linked accounts
- List queries default to `WHERE deleted_at IS NULL`

### Residual raw SQL in fetchers (fixed 2026-06-10)

`server/fetchers/github.ts` `fetchRepoReleases` used `getDb().prepare()` / `getDb().query()` with raw SQL, inconsistent with the Drizzle approach used elsewhere.

**Fix**: Switched to `upsertGithubRelease()` + Drizzle select.

### React async event `currentTarget` null (fixed 2026-06-10)

`Admin.tsx` and `Settings.tsx` called `e.currentTarget.reset()` after `await` in async event handlers. React synthetic events nullify `currentTarget` once the handler's synchronous execution completes.

**Fix**: Captured `formElement = e.currentTarget` before `await`.

### Drizzle `returning()` with `@libsql/client` (fixed 2026-06-10)

`createUser` used `.returning()` which generated INSERT statements with all columns listed explicitly, including `id = null`. The `@libsql/client` driver threw "Failed query" on this pattern.

**Fix**: Replaced `.returning()` with direct `getClient().execute()` using raw SQL. Also added soft-delete user revive logic to handle UNIQUE constraint on re-creation.

### Missing `await` on DB writes (fixed 2026-06-10)

Various calls to `deleteUser`, `deleteAccount`, `updateAccount`, `insertUserStats`, `upsertTweet`, etc. were missing `await`, causing silent failures.

**Fix**: Added `await` to all async DB write calls across server routes and fetchers.

## Open

### High

#### 1. Zero test coverage
No test files in the entire project. Critical risk given the history of ORM + raw SQL mixing and the async DB operations.

#### 2. Session token in cleartext
Cookie (`dash_session`) contains base64-encoded `username:role:expires:sig`. Username and role are in cleartext. No `__Host-` prefix. `Secure` flag only set in production mode (HTTPS). Should use encrypted JWT or server-stored sessions.

#### 3. Duplicate client type declarations
`client/src/api.ts` has ~250 lines of interface definitions that duplicate server schema types with no sharing mechanism. Prone to drift. Could use `drizzle-kit` or `openapi-typescript` for code generation.

### Medium

#### 4. No structured logging
Only `console.log` / `console.error` throughout the project. No log levels, structured output, or log files. Fetcher run status has no persistent record.

#### 5. Missing retry on fetchers
Only the Twitter fetcher handles 429 rate limits with retry. GitHub, GitLab, and Reddit fetchers throw immediately on API failure.

#### 6. No fetcher monitoring
No dashboard or metrics for fetcher success/failure rates or runtime. Scheduler runs every 60s with no observable output beyond logs.

#### 7. Incomplete rate limiting
Only the login endpoint has in-memory rate limiting (10/min/IP), which resets on restart. No other API endpoints are rate-limited.

### Low

#### 8. Low theme variety
Only 2 dark themes, visually near-identical.

#### 9. i18n gaps
`Overview.tsx` occasionally references `redditDetail.noData` which may not exist in all locale files.

#### 10. Fetcher runs in main process
Scheduler runs in-process via `startScheduler()`. Heavy fetcher loads may block API responses.

#### 11. GraphQL string interpolation
`server/fetchers/github.ts:278` interpolates `${username}` into a GraphQL query string. Low risk but technically not parameterized.

#### 12. `ownerId` default is 1
`createAccount()` defaults `ownerId = 1` (admin). Route layer passes the correct user ID for non-admin requests, but the function signature encodes an admin-first assumption.

#### 13. Vite plugin hack
`client/vite.config.ts` `suppressBaseHintPlugin()` monkey-patches Vite internals at runtime. May break on version upgrades.
