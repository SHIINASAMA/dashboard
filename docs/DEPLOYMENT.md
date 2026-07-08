# Deployment

## Docker (Recommended)

### Quick Start

```bash
cp .env.example .env
# Edit .env, set DASHBOARD_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

The compose stack includes:
- **dashboard** — the app (port 3000)
- **postgres** — PostgreSQL 16 (port 5432)

### Volumes

| Volume | Container Path | Contents |
|--------|---------------|----------|
| `dashboard_data` | `/app/data` | Database, logs |
| `pg_data` | `/var/lib/postgresql/data` | PostgreSQL data |

### Environment Variables

Pass env vars via `.env` file or `docker-compose.yml` environment section. See [CONFIGURATION.md](CONFIGURATION.md) for all options.

Key variables for Docker:
- `DASHBOARD_SECRET` — required, must be set in `.env`
- `DATABASE_URL` — defaults to `postgresql://dashboard:dashboard@postgres:5432/dashboard`
- `ALLOWED_ORIGINS` — set if accessing from a different domain

### Building from Source

```bash
docker compose build
docker compose up -d
```

The Dockerfile uses a multi-stage build:
1. **Stage 1** (`node:22-slim`): installs dependencies and builds the Next.js standalone server
2. **Stage 2** (`node:22-slim`): runs the standalone output on port 3000 as a non-root user

## Standalone

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL

### Development

```bash
pnpm install
pnpm run dev
```

### Production

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run start
```

The production app runs as a single Next.js process on port 3000.

## Database

### PostgreSQL (Default)

The app uses Drizzle ORM with the `pg` driver. On first run, tables are created automatically via the migration system.

### Migrations

Migrations and bootstrap setup run automatically on startup. The startup flow:
1. Creates tables if they don't exist
2. Adds missing columns (e.g., `owner_id`, `deleted_at`)
3. Creates indexes
4. Bootstraps the admin user

### Backup

```bash
# PostgreSQL
pg_dump -U dashboard dashboard > backup.sql

```

## Kubernetes

A GitLab CI pipeline (`.gitlab-ci.yml`) builds and deploys to a Kubernetes cluster:

1. **Build**: Kaniko builds the Docker image, pushes to `reg.mikumikumi.xyz/kaoru/dashboard`
2. **Deploy**: kubectl updates the StatefulSet image

## Reverse Proxy

In production, place a reverse proxy (nginx, Caddy, Traefik) in front of the app:

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

Set `ALLOWED_ORIGINS=https://dashboard.example.com` and `HTTPS=true` in the app config.
