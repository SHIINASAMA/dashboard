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

Open `http://localhost:3000`. On first run, log in as `admin` with empty password, then set a password in Settings.

### Standalone

```bash
pnpm install
pnpm run dev
```

The app starts on port 3000.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22 + pnpm |
| **Backend** | Next.js Route Handlers |
| **Frontend** | React 19 + Next.js App Router + TypeScript |
| **Build** | Next.js standalone |
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
| `PORT` | `3000` | Listen port |
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
- **dashboard** — the app (port 3000)
- **postgres** — PostgreSQL 16 (port 5432)

### Standalone Production

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run start
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
        proxy_pass http://localhost:3000;
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
├── app/                    # Next.js pages and API routes
├── components/             # Shared UI components
├── db/schema/              # Drizzle ORM schema files
├── lib/                    # Server/client shared utilities, DB, fetchers
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

- Node.js 22+
- pnpm
- PostgreSQL

### Setup

```bash
pnpm install
cp .env.example .env
# Set DASHBOARD_SECRET in .env
pnpm run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Next.js dev server |
| `pnpm run start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run lint` | ESLint |

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
