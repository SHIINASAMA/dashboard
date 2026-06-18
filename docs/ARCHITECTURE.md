# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Bun runtime |
| **Backend** | Hono REST API (port 3001) |
| **Frontend** | Vite + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Charts** | Recharts |
| **Icons** | lucide-react |
| **Data Fetching** | @tanstack/react-query |
| **OR/M** | Drizzle ORM with `@libsql/client` |
| **Database** | SQLite at `data/db/dashboard.db` |
| **Auth** | JWT (HS256) signed session cookies + Argon2id |
| **Encryption** | AES-256-GCM (credentials at rest) |

## Source Layout

```
dashboard/
├── db/
│   ├── schema/               # Drizzle ORM schema files
│   │   ├── index.ts          # Re-exports all schemas
│   │   ├── users.ts          # users table
│   │   ├── accounts.ts       # accounts table
│   │   ├── twitter.ts        # user_stats, tweets tables
│   │   ├── github.ts         # GitHub tables (stats, repos, snapshots, traffic, releases, contributions)
│   │   ├── gitlab.ts         # GitLab tables (stats, projects, snapshots, releases, contributions)
│   │   ├── reddit.ts         # Reddit tables (stats, posts, comments)
│   │   └── settings.ts       # settings table
│   └── migrate.ts            # One-shot migration: users table, owner_id, indexes
├── server/
│   ├── index.ts              # Server entry, auth routes, middleware, static serving
│   ├── setup.ts              # Bootstrap: config, encryption key, migrations, admin user
│   ├── config.ts             # Config load/save (JSON file)
│   ├── auth.ts               # Argon2id password hashing, multi-user login
│   ├── crypto.ts             # HMAC signing + AES-256-GCM encryption, JWT secret
│   ├── logger.ts             # Structured file logger with rotation
│   ├── http.ts               # fetchWithConfig (TLS-configurable wrapper)
│   ├── scheduler.ts          # Per-platform dispatch every 60s
│   ├── fetcher.ts            # X (Twitter) fetcher
│   ├── db/
│   │   └── connection.ts     # Drizzle + libsql client factory (singleton)
│   ├── repositories/         # Data access layer (Drizzle queries per domain)
│   │   ├── index.ts          # Re-exports all repositories
│   │   ├── users.ts          # User CRUD
│   │   ├── accounts.ts       # Account CRUD + stats
│   │   ├── twitter.ts        # Tweet + user_stats queries
│   │   ├── github.ts         # GitHub data queries
│   │   ├── gitlab.ts         # GitLab data queries
│   │   ├── reddit.ts         # Reddit data queries
│   │   └── settings.ts       # Key-value settings
│   ├── services/             # Business logic layer
│   │   ├── index.ts          # Re-exports all services
│   │   ├── users.ts          # User business logic
│   │   └── accounts.ts       # Account business logic
│   ├── fetchers/             # Per-platform data fetchers
│   │   ├── github.ts         # GitHub fetcher
│   │   ├── gitlab.ts         # GitLab fetcher
│   │   └── reddit.ts         # Reddit fetcher (OAuth + public)
│   └── routes/               # REST API route handlers
│       ├── accounts.ts       # Account CRUD endpoints
│       ├── confirm.ts        # Confirmation token endpoint
│       ├── github.ts         # GitHub data endpoints
│       ├── gitlab.ts         # GitLab data endpoints
│       ├── reddit.ts         # Reddit data endpoints
│       ├── stats.ts          # X/Twitter stats endpoints
│       └── tweets.ts         # X/Twitter tweet endpoints
├── client/
│   └── src/
│       ├── App.tsx           # Route definitions + auth guards
│       ├── api.ts            # API client + TypeScript interfaces
│       ├── components/       # Shared UI components
│       │   ├── Layout.tsx    # Sidebar + title bar + content area
│       │   ├── Skeleton.tsx  # Skeleton loading primitives
│       │   ├── NavigationProgress.tsx  # Top progress bar
│       │   └── NavigatingOverlay.tsx   # Full-screen loading overlay
│       ├── lib/              # Utilities (cn(), themes, hooks)
│       ├── locales/          # i18n (en.json, zh.json)
│       └── pages/            # Page components per platform
├── shared/                   # Shared types between client/server
├── scripts/                  # Utility scripts
└── data/                     # Runtime data (config.json, db/)
```

## Data Flow

```
User clicks "Fetch" (or scheduler ticks)
        │
        ▼
  Route handler (server/routes/*.ts)
        │
        ▼
  Service (server/services/*.ts)  ← business logic, orchestration
        │
        ▼
  Fetcher (server/fetchers/*.ts)
    → External API (X, GitHub, GitLab, Reddit)
    → Parse + transform
        │
        ▼
  Repository (server/repositories/*.ts)  ← Drizzle ORM queries
    → SQLite
        │
        ▼
  React Query cache invalidation
        │
        ▼
  Frontend re-render
```

## Key Patterns

- **Singleton Drizzle client** — `getDb()` in `server/db/connection.ts` returns a cached drizzle instance wrapping a libsql client. No per-request connections.
- **Three-layer architecture** — Routes (HTTP) → Services (business logic) → Repositories (data access). Fetchers sit alongside services, called by routes or scheduler.
- **Soft-delete** — All destructive operations set `deleted_at = datetime('now')` instead of DELETE. List queries filter with `deleted_at IS NULL`. Users with the same username can be revived on re-creation.
- **Confirmation tokens** — Destructive operations (delete account, delete user) require a 6-character random token with 5-minute TTL.
- **Encrypted credentials** — Auth tokens, API keys, and cookies are encrypted with AES-256-GCM before storage. Decrypted in-memory during fetch cycles.
- **JWT sessions** — Session tokens are signed JWTs (HS256) with 7-day expiry, stored in httpOnly cookies.
- **Per-platform fetchers** — Each platform has an independent fetcher module. The scheduler dispatches by platform, running all active accounts for that platform sequentially.
- **Multi-user isolation** — `owner_id` on accounts links to `users.id`. Non-admin users only see their own accounts.
