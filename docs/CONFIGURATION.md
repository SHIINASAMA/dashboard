# Configuration

All configuration is via environment variables. No filesystem config files are used at runtime (the old `data/config.json` has been replaced).

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DASHBOARD_SECRET` | 64-char hex string for AES-256-GCM encryption and JWT signing | `openssl rand -hex 32` |

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3001` | Listen port |
| `HTTPS` | `false` | Set `true` for HTTPS mode |
| `DATA_DIR` | `./data` | Root data directory (config, db, logs) |
| `NODE_ENV` | — | Set `production` for prod mode |

## Database

The app uses PostgreSQL (via Drizzle ORM + `pg` driver). SQLite support is legacy.

**Option A: `DATABASE_URL`**

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**Option B: Individual variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `PG_HOST` | `localhost` | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_DB` | `dashboard` | Database name |
| `PG_USER` | `dashboard` | Database user |
| `PG_PASSWORD` | `""` | Database password |

## Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD_HASH` | `""` | Argon2id hash for bootstrap admin password |

## CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `""` (none) | Comma-separated allowed origins. `*` for all. |

## Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_DIR` | `data/logs` | Log file directory |
| `LOG_LEVEL` | `info` | Level: `debug`, `info`, `warn`, `error` |
| `LOG_MAX_SIZE` | `10m` | Max size per log file before rotation |
| `LOG_MAX_FILES` | `5` | Number of rotated log files to keep |

## Proxy

| Variable | Description |
|----------|-------------|
| `HTTPS_PROXY` | HTTPS proxy for outbound requests (X.com, GitLab, etc.) |
| `HTTP_PROXY` | HTTP proxy for outbound requests |

## TLS

| Variable | Default | Description |
|----------|---------|-------------|
| `TLS_REJECT_UNAUTHORIZED` | `true` | Set `false` for self-signed certs (private GitLab, MITM proxies) |

## Reddit OAuth

| Variable | Description |
|----------|-------------|
| `REDDIT_CLIENT_ID` | Reddit API client ID (for OAuth mode) |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret |

## .env.example

A complete `.env.example` is provided in the project root. Copy it to `.env` and fill in `DASHBOARD_SECRET`:

```bash
cp .env.example .env
# Edit .env, set DASHBOARD_SECRET=$(openssl rand -hex 32)
```
