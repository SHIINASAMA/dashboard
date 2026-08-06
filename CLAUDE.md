# Dashboard

Multi-platform data dashboard with web UI. Track activity and stats across X (Twitter), GitHub, GitLab, and Reddit — all in one place.

## Tech Stack

pnpm + React Router 7 (Framework Mode) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui-style components + Drizzle ORM + PostgreSQL (`pg`). The production server is a single Node.js process (`node server/index.mjs`) using `@react-router/node` plus a hand-written static-file server for `build/client`. API routes live in `app/api/*/route.ts` (declared in `app/routes.ts`).

## Key Facts

- **Runtime** — Node.js 22 (no Bun). The old Hono standalone server and `bun:sqlite` are gone.
- **Database** — PostgreSQL only. `bootstrap()` in `lib/setup.ts` creates missing tables and seeds `admin`; it is triggered lazily on the first request by `app/auth-middleware.server.ts` (once per process).
- **Mock mode** — `MOCK_DATA=1` (plus `NEXT_PUBLIC_MOCK_DATA=1` for the client banner) serves fixtures from `lib/mock` and skips PostgreSQL/auth.
- **Config** — env-only via `lib/config.ts`; `data/config.json` is a legacy artifact and is never read.
- **React Router version** — pinned to `7.18.2` (with a pnpm patch in `patches/`) for stability; do not upgrade to v8 without explicit approval.
- **Memory-constrained builds** — always use the `build:client` / `build:server` split (`RR_SKIP_SSR=1` / `RR_SKIP_CLIENT=1`) with bounded Node heaps; CI OOMs otherwise.
- **`"use client"` is not used** — React Router v7 does not need it; do not reintroduce it.

## Quick Start

```bash
pnpm install && pnpm run dev
```

## Documentation Index

### Architecture & Design

- [Architecture](docs/ARCHITECTURE.md) — Tech stack, source layout, data flow, key patterns
- [Database](docs/DATABASE.md) — Schema files, table definitions, migration process, conventions
- [Frontend](docs/FRONTEND.md) — React architecture, routing, i18n, theming

### API & Integration

- [API Reference](docs/API.md) — REST endpoints (auth, users, accounts, per-platform data)
- [Fetchers](docs/FETCHERS.md) — Platform fetcher internals, fetch flow, rate limiting, hardening

### Configuration & Deployment

- [Configuration](docs/CONFIGURATION.md) — Environment variables, database, proxy, logging
- [Deployment](docs/DEPLOYMENT.md) — Docker, standalone, Kubernetes, reverse proxy

### Development

- [Testing](docs/TESTING.md) — Test setup, coverage, how to add tests
- [Scripts](docs/SCRIPTS.md) — Utility scripts (X data dump, fetch algorithm test)

### Project Management

- [TODO](docs/TODO.md) — Feature backlog and completed items
- [Issues](docs/ISSUES.md) — Known bugs, regressions, open issues

### Plans & Specs

- [Multi-user Drizzle migration plan](docs/superpowers/plans/2026-06-09-multi-user-drizzle.md)
- [Multi-user Drizzle design spec](docs/superpowers/specs/2026-06-09-multi-user-drizzle-design.md)

### Rules

- [Collaboration Rules](docs/COLLABORATION_RULES.md) — AI assistant behavior rules, language, prohibited actions
