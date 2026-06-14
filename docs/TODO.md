# TODO

## Feature Backlog

- [ ] Session token hardening (encrypted JWT or server-stored sessions instead of HMAC-signed cookie with plaintext username/role)
- [ ] Add rate limiting to all API endpoints (currently only login is rate-limited)
- [ ] Fetcher retry mechanism for GitHub/GitLab/Reddit (429 and 5xx)
- [ ] Fetcher monitoring dashboard (success/failure rates, last run time)
- [ ] Client/server type sharing (drizzle-kit or openapi-typescript)
- [ ] GitHub GraphQL query parameterization (currently `${username}` string interpolation)
- [ ] Fetcher background worker isolation (currently runs in main server process)
- [ ] Theme variety (currently only 2 dark themes with minimal visual difference)

## Completed

- [x] Unified database access (eliminated mixed `bun:sqlite` + Drizzle ORM)
- [x] Soft-delete for all destructive operations
- [x] Eliminated SQL injection risks from string-concatenated queries
- [x] User revive on re-creation after soft-delete
- [x] Fix React async event handler `currentTarget` null issue
- [x] Structured logging (file logger with rotation in `server/logger.ts`)
- [x] Integration test suite (auth, crypto, db-queries in `server/__tests__/`)
- [x] Fetcher hardening (timeouts, concurrency guards, progress logging, batch upserts)
