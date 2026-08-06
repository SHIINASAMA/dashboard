# TODO

## Feature Backlog

- [ ] Session token hardening (encrypted JWT or server-stored sessions instead of HS256 JWT with readable username/role payload)
- [ ] Add rate limiting to all API endpoints (currently only login is rate-limited)
- [ ] HTTP-level retry for GitHub/GitLab/Reddit fetchers (429 and 5xx, honoring `Retry-After`; transport-level retry already exists in `lib/http.ts`)
- [ ] Fetcher monitoring dashboard (success/failure rates, last run time)
- [ ] Fetcher background worker isolation (currently runs in the main server process)
- [ ] Persistent confirmation tokens (currently in-memory `Map` in `lib/confirm-helpers.ts`)

## Completed

- [x] Unified database access (eliminated mixed `bun:sqlite` + Drizzle ORM)
- [x] Soft-delete for all destructive operations
- [x] Eliminated SQL injection risks from string-concatenated queries
- [x] User revive on re-creation after soft-delete
- [x] Fix React async event handler `currentTarget` null issue
- [x] Structured logging (file logger with rotation in `lib/logger.ts`)
- [x] Integration test suite (auth, crypto, db-queries in `tests/`)
- [x] Fetcher hardening (timeouts, concurrency guards, progress logging, batch upserts)
- [x] Client/server type sharing (`shared/types.ts`, re-exported by `lib/api.ts`)
- [x] GitHub GraphQL query parameterization (variables instead of `${username}` interpolation)
- [x] Theme variety (12 themes: default, sepia, cyber, forest, sky, rose × light/dark)
- [x] Remove Vite `suppressBaseHintPlugin` hack
- [x] Migrate from Next.js to React Router 7 Framework Mode
- [x] Mobile-first responsive polish (touch targets ≥44px, safe-area insets, adaptive sidebar/grids)
