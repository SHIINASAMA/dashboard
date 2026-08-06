# Dashboard

Multi-platform data dashboard with web UI. Track activity and stats across X (Twitter), GitHub, GitLab, and Reddit — all in one place.

## Tech Stack

Node.js + pnpm + React Router 7 Framework Mode + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Drizzle ORM + PostgreSQL

## Quick Start

```bash
pnpm install && pnpm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start React Router dev server |
| `pnpm run mock` | Dev server in mock/fixture mode (no DB needed) |
| `pnpm run build` | Build client + server (memory-bounded passes) |
| `pnpm run start` | Run the production server |
| `pnpm run lint` | Run ESLint |
| `pnpm run typecheck` | Run TypeScript type check |
| `pnpm test` | Run the Vitest test suite |

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
