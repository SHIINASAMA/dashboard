# Dashboard Knowledge Base

## Overview

Multi-platform data dashboard with web UI for managing X (Twitter) and GitHub accounts, automatic data fetching, and visualization.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, lucide-react, @tanstack/react-query
- **Backend**: Bun + Hono REST API (port 3001)
- **Database**: SQLite (Bun built-in) at `data/dashboard.db`
- **Dev**: `bun run dev` from root (starts both server and client), or separately with `bun run server` / `bun run client`

## Project Structure

```
dashboard/
├── db/
│   └── schema.ts          # Migrations system (versioned)
├── server/
│   ├── index.ts            # Server entry, routes, scheduler start
│   ├── db.ts               # All CRUD operations
│   ├── fetcher.ts          # Twitter data fetching with rate-limit retry
│   ├── scheduler.ts        # Per-platform dispatch every 60s
│   ├── fetchers/
│   │   └── github.ts       # GitHub REST + GraphQL data fetching
│   └── routes/
│       ├── accounts.ts     # Account CRUD routes
│       └── github.ts       # GitHub data + repo insights routes
├── client/
│   └── src/
│       ├── App.tsx         # Route definitions
│       ├── main.tsx        # Entry point (BrowserRouter wrapper)
│       ├── api.ts          # API client + TypeScript interfaces
│       ├── components/
│       │   ├── Layout.tsx  # Sidebar nav layout
│       │   ├── AddAccountForm.tsx  # Reusable account creation modal
│       │   ├── StatCard.tsx
│       │   └── ui/         # shadcn/ui components
│       └── pages/
│           ├── Overview.tsx    # Multi-platform overview
│           ├── X.tsx           # X platform page (accounts list + stats)
│           ├── XDetail.tsx     # X account detail (tweets + engagement charts)
│           ├── GitHub.tsx      # GitHub platform page (accounts list)
│           ├── GitHubDetail.tsx # GitHub account detail (repos + stats + contributions)
│           └── RepoDetail.tsx  # Per-repo insights (star history, traffic, releases)
├── patches/
│   └── postinstall.sh     # Patches twitter-openapi-typescript for null safety
├── scripts/               # Original standalone scripts (kept intact)
└── AGENTS.md
```

## Routes

| Path | Page |
|---|---|
| `/` | Overview (multi-platform stats) |
| `/x` | X platform: accounts list + aggregated stats |
| `/x/:id` | X account detail: tweets, engagement charts |
| `/github` | GitHub platform: accounts list |
| `/github/:id` | GitHub account detail: repos, stats, contributions |
| `/github/:accountId/repos/:repoId` | Repo insights: star history, traffic, referrers, releases |

## Database Migrations

Located in `db/schema.ts`. Uses a `_migrations` tracking table.

**Adding a new migration**: Append an entry to the `MIGRATIONS` array with `{ version, name, up(db) }`. Never modify existing migrations.

Current migrations:
- **v1** (initial schema): accounts, user_stats, tweets, github_stats, github_repos, github_contributions
- **v2** (repo insights): github_repo_snapshots, github_traffic_clones, github_traffic_views, github_referrers, github_paths, github_releases, github_release_assets

## Key Conventions

- **NEVER delete `data/dashboard.db`** — use migrations for schema changes
- All account credentials managed via web UI, not env vars
- Add `platform` column to `accounts` table for multi-platform support
- Postinstall script patches `Entities.js`/`ExtendedEntities.js` in `twitter-openapi-typescript-generated` for null safety
- Old scripts in `scripts/` are kept intact; scheduler replaces their functionality
- PRAGMA `journal_mode = WAL` for better concurrent access

## API Endpoints

### Accounts
- `GET /api/accounts` — list all accounts + overview stats
- `GET /api/accounts/:id` — get account (without auth_token) + latest stats
- `POST /api/accounts` — create account `{ screenName, authToken, fetchInterval, platform }`
- `PUT /api/accounts/:id` — update account fields
- `DELETE /api/accounts/:id` — delete account + all related data
- `POST /api/fetch/:id` — trigger immediate fetch for account

### Twitter
- `GET /api/stats/overview` — aggregated tweet stats
- `GET /api/tweets?...` — paginated tweets with search/sort/account filter
- `GET /api/tweets/:id` — single tweet
- `GET /api/stats/timeline?months=6` — daily tweet + follower growth data
- `GET /api/stats/top?metric=favorite_count&limit=10` — top tweets by metric
- `GET /api/stats/calendar?year=2026` — tweet calendar heatmap data

### GitHub
- `GET /api/github/overview/:accountId` — profile stats + repos + languages + top repos
- `GET /api/github/timeline/:accountId` — follower/repo count over time
- `GET /api/github/contributions/:accountId` — contribution calendar
- `GET /api/github/:accountId/repos/:repoId/snapshots` — star/fork snapshots
- `GET /api/github/:accountId/repos/:repoId/clones` — daily clone counts
- `GET /api/github/:accountId/repos/:repoId/views` — daily page views
- `GET /api/github/:accountId/repos/:repoId/referrers` — top referring sites
- `GET /api/github/:accountId/repos/:repoId/paths` — popular content paths
- `GET /api/github/:accountId/repos/:repoId/releases` — releases with download stats

## GitHub Fetcher Details

`server/fetchers/github.ts` fetches per-account:
1. User profile (stats, followers, public repos)
2. Repos list (up to 100) — saved to `github_repos`
3. Daily snapshots of star/fork/open_issues counts — saved to `github_repo_snapshots`
4. Traffic data (clones, views, referrers, paths) — requires PAT, saved to respective tables
5. Releases with asset download counts — requires PAT, saved to `github_releases` + `github_release_assets`
6. Contribution calendar (GraphQL) — saved to `github_contributions`

Steps 4-5 require a GitHub PAT with repo scope. Without a token, those steps are skipped silently.

## Twitter Fetcher Details

`server/fetcher.ts`:
- Uses `twitter-openapi-typescript-generated` library
- Rate-limits: batchSize=50, maxTweets=800, 2s delay between batches, 5s retry wait
- Combined stats+tweet fetching in single `fetchAccount()` call
- auth_token from X.com cookies stored in SQLite

## Scheduler

`server/scheduler.ts` runs every 60s, dispatching fetch for each active account by platform. Uses `fetchAccount()` for X and `fetchGithubAccount()` for GitHub.

## Patches

After `bun install`, run `bash patches/postinstall.sh` to apply null-safety patches to `twitter-openapi-typescript-generated`. This is auto-run via `postinstall` in root `package.json`.
