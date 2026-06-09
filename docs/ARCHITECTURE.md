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
| **Auth** | HMAC-signed session cookies + Argon2id |
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
│   │   ├── github.ts         # GitHub tables
│   │   ├── gitlab.ts         # GitLab tables
│   │   ├── reddit.ts         # Reddit tables
│   │   └── settings.ts       # settings table
│   ├── schema.legacy.ts      # Old migration system (reference only)
│   └── migrate.ts            # One-shot migration: users table, owner_id
├── server/
│   ├── db/
│   │   ├── connection.ts     # Drizzle + libsql client factory
│   │   └── queries/          # Per-domain query files (Drizzle ORM)
│   ├── index.ts              # Server entry, routes, auth, static serving
│   ├── config.ts             # Config load/save (JSON file)
│   ├── crypto.ts             # HMAC signing + AES-256-GCM encryption
│   ├── auth.ts               # Argon2id password hashing, multi-user login
│   ├── setup.ts              # Bootstrap: config, encryption key, migrations
│   ├── scheduler.ts          # Per-platform dispatch every 60s
│   ├── fetchers/             # Per-platform data fetchers
│   └── routes/               # REST API route handlers
├── client/
│   └── src/
│       ├── App.tsx           # Route definitions + auth guards
│       ├── api.ts            # API client + TypeScript interfaces
│       ├── components/       # Shared UI components
│       ├── lib/              # Utilities (cn(), themes)
│       ├── locales/          # i18n (en.json, zh.json)
│       └── pages/            # Page components per platform
```

## Data Flow

```
User clicks "Fetch" (or scheduler ticks)
        │
        ▼
  Route handler (server/routes/*.ts)
        │
        ▼
  Fetcher (server/fetchers/*.ts)
    → External API (X, GitHub, GitLab, Reddit)
    → Parse + transform
        │
        ▼
  DB queries (server/db/queries/*.ts)
    → Drizzle ORM → SQLite
        │
        ▼
  React Query cache invalidation
        │
        ▼
  Frontend re-render
```

## Key Patterns

- **Singleton Drizzle client** — `getDb()` in `connection.ts` returns a cached drizzle instance wrapping a libsql client. No per-request connections.
- **Soft-delete** — All destructive operations set `deleted_at = datetime('now')` instead of DELETE. List queries filter with `deleted_at IS NULL`. Users with the same username can be revived on re-creation.
- **Confirmation tokens** — Destructive operations (delete account, delete user) require a 6-character HMAC-signed token with 5-minute TTL.
- **Encrypted credentials** — Auth tokens, API keys, and cookies are encrypted with AES-256-GCM before storage. Decrypted in-memory during fetch cycles.
- **Per-platform fetchers** — Each platform has an independent fetcher module. The scheduler dispatches by platform, running all active accounts for that platform sequentially.
- **Multi-user isolation** — `owner_id` on accounts links to `users.id`. Non-admin users only see their own accounts.
