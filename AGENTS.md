# Dashboard

Multi-platform data dashboard with web UI. Track activity and stats across X (Twitter), GitHub, GitLab, and Reddit — all in one place.

## Tech Stack

Node.js + pnpm + React Router 7 Framework Mode + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Drizzle ORM + PostgreSQL

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

## Context Routing

Read the relevant resource only when the task needs it. Do not load everything up front.

- **Project overview & setup** — read [README.md](README.md)
- **Human-facing documentation** — `docs/` (Architecture, Database, Frontend, API, Fetchers, Configuration, Deployment, Testing, Scripts, TODO, Issues)
- **Behavior rules for agents** — read `.agents/COLLABORATION_RULES.md` before making commits, destructive changes, or new docs
- **Implementation plans** — `.agents/plans/` (read when executing or updating a planned migration)
- **Design specs** — `.agents/specs/` (read when implementing a designed feature)
- **Framework/research evaluations** — `.agents/research/` (read before any framework migration decision)

## Documentation Index

- [Architecture](docs/ARCHITECTURE.md) — Tech stack, source layout, data flow, key patterns
- [Database](docs/DATABASE.md) — Schema files, table definitions, migration process, conventions
- [Frontend](docs/FRONTEND.md) — React architecture, routing, i18n, theming
- [API Reference](docs/API.md) — REST endpoints (auth, users, accounts, per-platform data)
- [Fetchers](docs/FETCHERS.md) — Platform fetcher internals, fetch flow, rate limiting, hardening
- [Configuration](docs/CONFIGURATION.md) — Environment variables, database, proxy, logging
- [Deployment](docs/DEPLOYMENT.md) — Docker, standalone, Kubernetes, reverse proxy
- [Testing](docs/TESTING.md) — Test setup, coverage, how to add tests
- [Scripts](docs/SCRIPTS.md) — Utility scripts (X data dump, fetch algorithm test)
- [TODO](docs/TODO.md) — Feature backlog and completed items
- [Issues](docs/ISSUES.md) — Known bugs, regressions, open issues
