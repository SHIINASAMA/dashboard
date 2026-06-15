# Dashboard

Multi-platform social & code dashboard with web UI. Track activity and stats across X (Twitter), GitHub, GitLab, and Reddit — all in one place.

## Features

- **Multi-platform tracking** — X (Twitter), GitHub, GitLab, Reddit in a single dashboard
- **Rich visualizations** — charts, stat cards, activity timelines, contribution heatmaps
- **Auto-fetching** — configurable per-account fetch intervals via background scheduler
- **Multi-user** — admin and regular users with full data isolation
- **Password auth** — Argon2id hashing, JWT session cookies
- **OAuth support** — Reddit OAuth; personal access tokens for GitHub/GitLab
- **Local-first** — all data stored in PostgreSQL (Drizzle ORM), no cloud dependencies
- **Encrypted credentials** — AES-256-GCM encryption for tokens and API keys at rest
- **Responsive design** — works on desktop and mobile with adaptive sidebar
- **i18n** — English and Chinese locale support
- **Theming** — multiple light and dark themes

## Quick Start

### Docker (Recommended)

```bash
cp .env.example .env
# Edit .env and set DASHBOARD_SECRET
openssl rand -hex 32  # generate a secret
docker compose up -d
```

Open `http://localhost:3001`. On first run, log in as `admin` with empty password, then set a password in Settings.

### Standalone

```bash
bun install
bun run dev
```

The server starts on port 3001, client dev server on a random port. Open the URL printed in the console.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun |
| **Backend** | Hono REST API |
| **Frontend** | React 19 + React Router + TypeScript |
| **Build** | Vite |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Charts** | Recharts |
| **Icons** | lucide-react |
| **Data Fetching** | @tanstack/react-query |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL (SQLite legacy) |
| **Auth** | Argon2id + JWT (HS256) session cookies |
| **Encryption** | AES-256-GCM for credentials at rest |
| **i18n** | react-i18next |

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required

| Variable | Description |
|----------|-------------|
| `DASHBOARD_SECRET` | 64-char hex string for encryption and JWT signing (`openssl rand -hex 32`) |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PG_HOST` | `localhost` | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_DB` | `dashboard` | Database name |
| `PG_USER` | `dashboard` | Database user |
| `PG_PASSWORD` | `""` | Database password |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3001` | Listen port |
| `NODE_ENV` | — | Set `production` for prod mode |

### Auth & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD_HASH` | `""` | Argon2id hash for bootstrap admin password |
| `ALLOWED_ORIGINS` | `""` | Comma-separated allowed origins (`*` for all) |
| `TLS_REJECT_UNAUTHORIZED` | `true` | Set `false` for self-signed certs |

### Proxy

| Variable | Description |
|----------|-------------|
| `HTTPS_PROXY` | HTTPS proxy for outbound requests |
| `HTTP_PROXY` | HTTP proxy for outbound requests |

### Reddit OAuth

| Variable | Description |
|----------|-------------|
| `REDDIT_CLIENT_ID` | Reddit API client ID |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_DIR` | `data/logs` | Log file directory |
| `LOG_LEVEL` | `info` | Level: `debug`, `info`, `warn`, `error` |
| `LOG_MAX_SIZE` | `10m` | Max size per log file before rotation |
| `LOG_MAX_FILES` | `5` | Number of rotated log files to keep |

## Deployment

### Docker Compose

```bash
docker compose up -d
```

The compose stack includes:
- **dashboard** — the app (port 3001)
- **postgres** — PostgreSQL 16 (port 5432)

### Standalone Production

```bash
bun install --production
cd client && bun install && bunx vite build
cd ..
bun run server
```

### Kubernetes

The project includes a GitLab CI pipeline (`.gitlab-ci.yml`) that builds and deploys to a Kubernetes cluster via Kaniko and kubectl.

### Reverse Proxy

Place nginx, Caddy, or Traefik in front:

```nginx
server {
    listen 443 ssl;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Project Structure

```
dashboard/
├── server/                 # Hono REST API
│   ├── index.ts            # Server entry, auth routes, middleware
│   ├── setup.ts            # Bootstrap: migrations, admin user
│   ├── config.ts           # Config management
│   ├── auth.ts             # Argon2id password hashing
│   ├── crypto.ts           # AES-256-GCM encryption, JWT signing
│   ├── scheduler.ts        # Background fetch scheduler (60s intervals)
│   ├── fetchers/           # Per-platform data fetchers
│   ├── repositories/       # Data access layer (Drizzle queries)
│   ├── services/           # Business logic layer
│   └── routes/             # REST API route handlers
├── client/                 # React SPA
│   └── src/
│       ├── App.tsx         # Route definitions + auth guards
│       ├── api.ts          # API client + TypeScript interfaces
│       ├── components/     # Shared UI components
│       ├── pages/          # Page components per platform
│       ├── lib/            # Utilities, hooks, i18n
│       └── locales/        # en.json, zh.json
├── db/schema/              # Drizzle ORM schema files
├── shared/                 # Shared types between client/server
├── scripts/                # Utility scripts
├── docs/                   # Project documentation
└── data/                   # Runtime data (config, db, logs)
```

## API Overview

All endpoints require authentication (JWT cookie) unless noted.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login with username/password |
| POST | `/api/logout` | Logout |
| GET | `/api/auth/me` | Check authentication status |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account (requires confirmation) |
| POST | `/api/accounts/:id/fetch` | Trigger immediate fetch |

### Platform Data

Each platform (x, github, gitlab, reddit) has dedicated endpoints for stats, timeline, and detailed data. See [docs/API.md](docs/API.md) for full reference.

## Development

### Prerequisites

- [Bun](https://bun.sh/) runtime
- PostgreSQL (or use SQLite with modifications)

### Setup

```bash
bun install
cp .env.example .env
# Set DASHBOARD_SECRET in .env
bun run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (server + client) |
| `bun run server` | Start server only |
| `bun run test` | Run server tests |
| `bun run typecheck` | TypeScript type checking |
| `cd client && bun run lint` | ESLint for client |

### Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Tech stack, source layout, data flow, key patterns
- [Frontend](docs/FRONTEND.md) — React architecture, routing, theming, i18n
- [API Reference](docs/API.md) — REST endpoint documentation
- [Configuration](docs/CONFIGURATION.md) — All environment variables
- [Deployment](docs/DEPLOYMENT.md) — Docker, standalone, Kubernetes
- [Database](docs/DATABASE.md) — Schema files, migrations
- [Fetchers](docs/FETCHERS.md) — Platform fetcher internals
- [Testing](docs/TESTING.md) — Test setup and coverage
- [Issues](docs/ISSUES.md) — Known bugs and regressions
- [TODO](docs/TODO.md) — Feature backlog

## License

[Apache License 2.0](LICENSE)

This work is a derivative of software originally released under the MIT License (Copyright 2024 xiaoxiunique).
