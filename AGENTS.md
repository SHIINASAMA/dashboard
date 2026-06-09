# Dashboard Knowledge Base

## Rules (MUST follow)

- **NEVER commit or `git push` without explicit user permission.** The user must explicitly ask you to commit or push before you do so. Running `/goal` does not count as permission to commit.
- **NEVER run destructive database operations** (drop, truncate, or delete password_hash/rows in the database or config.json) without explicit user permission.
- **NEVER delete or modify `data/config.json`** unless the user explicitly asks. This file contains the user's password hash and URL prefix.

## Overview

Multi-platform data dashboard with web UI for managing X (Twitter), GitHub, GitLab, and Reddit accounts, automatic data fetching, and visualization.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, lucide-react, @tanstack/react-query
- **Backend**: Bun + Hono REST API (port 3001)
- **Database**: SQLite via Drizzle ORM (`@libsql/client`) at `data/db/dashboard.db`
- **Dev**: `bun run dev` from root (starts both server and client), or separately with `bun run server` / `bun run client`

## Project Structure

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
│   │   ├── connection.ts     # Drizzle client factory (SQLite via @libsql)
│   │   └── queries/          # Per-domain query files
│   │       ├── accounts.ts   # Account CRUD (Drizzle)
│   │       ├── users.ts      # User CRUD (Drizzle + Argon2id)
│   │       ├── twitter.ts    # Twitter queries (raw SQL stubs)
│   │       ├── github.ts     # GitHub queries (raw SQL stubs)
│   │       ├── gitlab.ts     # GitLab queries (raw SQL stubs)
│   │       ├── reddit.ts     # Reddit queries (raw SQL stubs)
│   │       ├── settings.ts   # Settings key-value (Drizzle)
│   │       ├── types.ts      # Shared type re-exports
│   │       └── index.ts      # Re-exports all queries
│   ├── index.ts              # Server entry, routes, auth, static serving
│   ├── db.ts                 # Re-exports from server/db/queries/
│   ├── config.ts             # Config load/save (JSON file)
│   ├── crypto.ts             # HMAC signing + AES encryption
│   ├── auth.ts               # Argon2id password hashing, multi-user login
│   ├── setup.ts              # Bootstrap: config, encryption key, migrations
│   ├── scheduler.ts          # Per-platform dispatch every 60s
│   ├── fetchers/
│   │   ├── github.ts         # GitHub REST + GraphQL data fetching
│   │   ├── gitlab.ts         # GitLab API data fetching
│   │   └── reddit.ts         # Reddit OAuth + public cookie fetching
│   └── routes/
│       ├── accounts.ts       # Account CRUD routes (with confirmToken)
│       ├── confirm.ts        # Confirmation token generation
│       ├── stats.ts          # Twitter stats/timeline/top tweets
│       ├── tweets.ts         # Twitter tweets CRUD
│       ├── github.ts         # GitHub overview, timeline, contributions, repo insights
│       ├── gitlab.ts         # GitLab overview, timeline, contributions, project insights
│       └── reddit.ts         # Reddit overview, timeline, activity, subreddits
├── client/
│   └── src/
│       ├── App.tsx           # Route definitions + auth guards
│       ├── main.tsx          # Entry point (BrowserRouter wrapper)
│       ├── api.ts            # API client + TypeScript interfaces
│       ├── components/
│       │   ├── Layout.tsx    # Sidebar nav layout (admin link for admins)
│       │   ├── AddAccountForm.tsx  # Reusable account creation modal
│       │   ├── EditAccountForm.tsx # Account edit modal
│       │   ├── BrandIcons.tsx     # Platform icon components
│       │   ├── StatCard.tsx
│       │   ├── ThemeProvider.tsx
│       │   └── ui/           # shadcn/ui components (card, badge, separator, ConfirmDialog)
│       ├── lib/
│       │   └── utils.ts      # cn() classname helper
│       ├── locales/
│       │   ├── zh.json       # Chinese translations
│       │   └── en.json       # English translations
│       └── pages/
│           ├── Overview.tsx      # Multi-platform overview dashboard
│           ├── Admin.tsx         # Admin user management (create/delete users)
│           ├── X.tsx             # X platform page (accounts list + stats)
│           ├── XDetail.tsx       # X account detail (tweets + engagement charts)
│           ├── GitHub.tsx        # GitHub platform page (accounts list)
│           ├── GitHubDetail.tsx  # GitHub account detail (repos + stats + contributions)
│           ├── RepoDetail.tsx    # GitHub repo insights (star history, traffic, releases)
│           ├── GitLab.tsx        # GitLab platform page (accounts list)
│           ├── GitLabDetail.tsx  # GitLab account detail (projects + stats + contributions)
│           ├── ProjectDetail.tsx # GitLab project insights (star history, releases)
│           ├── Reddit.tsx        # Reddit platform page (accounts list)
│           ├── RedditDetail.tsx  # Reddit account detail (karma, posts, comments, subreddits)
│           ├── Settings.tsx      # Password + theme + language management
│           └── Login.tsx         # Login page (username + password)
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
| `/gitlab` | GitLab platform: accounts list |
| `/gitlab/:id` | GitLab account detail: projects, stats, contributions |
| `/gitlab/:accountId/projects/:projectId` | Project insights: star history, releases |
| `/reddit` | Reddit platform: accounts list |
| `/reddit/:id` | Reddit account detail: karma trends, posts, comments, subreddits |
| `/admin` | Admin: user management (create/delete users) |
| `/settings` | Settings: change password, theme, language |
| `/login` | Login page (unauthenticated) |

## Database Migrations

Drizzle ORM schemas live in `db/schema/`. Legacy migration system kept as `db/schema.legacy.ts`.

One-shot migration script `db/migrate.ts` handles:
- Creating `users` table
- Adding `owner_id` column to `accounts`
- Bootstrapping admin user from config.json password hash

Run automatically during `bootstrap()` in `server/setup.ts`.

**Adding a new table**: Create a Drizzle schema file in `db/schema/`, export from `index.ts`.

## Key Conventions

- **NEVER delete `data/db/dashboard.db`** — use Drizzle schemas + migrations for schema changes
- All account credentials managed via web UI, not env vars
- `auth_type` column on accounts: `"reddit_oauth"`, `"reddit_public"`, `"github_pat"`, etc.
- `owner_id` column on accounts links to `users.id` for multi-user isolation
- Old scripts in `scripts/` are kept intact; scheduler replaces their functionality
- PRAGMA `journal_mode = WAL` for better concurrent access
- Drizzle ORM queries are **async** (await `.all()`, `.get()`, `.run()`)
- Confirmation tokens required for all destructive operations (delete account, delete user)

## API Endpoints

### Auth
- `POST /api/auth/login` — authenticate with `{ username, password }`, get session cookie with role
- `GET /api/auth/me` — check current session, returns `{ authenticated, username, role }`
- `POST /api/auth/logout` — clear session
- `POST /api/auth/change-password` — change password (requires session)

### Users (admin only)
- `GET /api/users` — list all users (no password hashes)
- `POST /api/users` — create user `{ username, password, role }`
- `DELETE /api/users/:id` — delete user and their accounts

### Confirmation Tokens
- `POST /api/confirm/token` — get a one-time 6-char confirmation token (5-min expiry)

### Accounts
- `GET /api/accounts` — list all accounts + overview stats
- `GET /api/accounts/:id` — get account (without auth_token) + latest stats
- `POST /api/accounts` — create account `{ screenName, authToken, fetchInterval, platform, instanceUrl?, authType? }`
- `PUT /api/accounts/:id` — update account fields
- `DELETE /api/accounts/:id` — delete account + all related data (requires `{ confirmToken }`)

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
- `PUT /api/github/repos/pin` — set pinned repos

### GitLab
- `GET /api/gitlab/overview/:accountId` — profile stats + projects
- `GET /api/gitlab/timeline/:accountId` — follower/project count over time
- `GET /api/gitlab/contributions/:accountId` — contribution calendar
- `PUT /api/gitlab/projects/pin` — set pinned projects
- `GET /api/gitlab/:accountId/projects/:projectId/snapshots` — star/fork snapshots
- `GET /api/gitlab/:accountId/projects/:projectId/releases` — releases with download stats

### Reddit
- `GET /api/reddit/overview/:accountId` — karma stats + post/comment counts + top posts
- `GET /api/reddit/timeline/:accountId` — karma timeline (post + comment karma over time)
- `GET /api/reddit/posts/:accountId` — paginated posts
- `GET /api/reddit/comments/:accountId` — paginated comments
- `GET /api/reddit/activity/:accountId` — daily post + comment activity counts
- `GET /api/reddit/subreddits/:accountId` — subreddit distribution

## Fetcher Details

### X (Twitter)
`server/fetcher.ts`:
- Uses `twitter-openapi-typescript` library (wraps `twitter-openapi-typescript-generated`)
- Rate-limits: batchSize=50, maxTweets=800, 2s delay between batches, 5s retry wait
- Combined stats+tweet fetching in single `fetchAccount()` call
- auth_token from X.com cookies stored in SQLite
- **Pinned tweets**: not returned by `getUserTweets` or `getUserTweetsAndReplies`.
  Discovered via `legacy.pinnedTweetIdsStr` from `getUserByScreenName`, then fetched with `getTweetDetail`.
- **Repost counting**: X.com UI shows reposts as `retweetCount + quoteCount`.
  The API separates these two fields; store their sum as `retweet_count` in `tweets` table.
- Rate-limits: batchSize=50, maxTweets=800, 2s delay between batches, 5s retry wait
- Combined stats+tweet fetching in single `fetchAccount()` call
- auth_token from X.com cookies stored in SQLite

### GitHub
`server/fetchers/github.ts` fetches per-account:
1. User profile (stats, followers, public repos)
2. Repos list (up to 100) — saved to `github_repos`
3. Daily snapshots of star/fork/open_issues counts — saved to `github_repo_snapshots`
4. Traffic data (clones, views, referrers, paths) — requires PAT, saved to respective tables
5. Releases with asset download counts — requires PAT, saved to `github_releases` + `github_release_assets`
6. Contribution calendar (GraphQL) — saved to `github_contributions`

Steps 4-5 require a GitHub PAT with repo scope. Without a token, those steps are skipped silently.

### GitLab
`server/fetchers/gitlab.ts` fetches per-account:
1. User profile (stats, followers, public projects)
2. Projects list — saved to `gitlab_projects`
3. Daily snapshots of star/fork/open_issues counts — saved to `gitlab_project_snapshots`
4. Releases with asset download counts — saved to `gitlab_releases` + `gitlab_release_assets`
5. Contribution calendar (requires `instance_url` for self-hosted GitLab) — saved to `gitlab_contributions`

### Reddit
`server/fetchers/reddit.ts` supports two auth modes:
- **OAuth** (`fetchRedditAccount`): uses Reddit API with refresh-token flow
- **Public cookie** (`fetchRedditPublicAccount`): uses `.reddit` session cookie for accounts without API access

Each fetches: user profile karma, posts, comments, and subreddit activity. Data saved to `reddit_stats`, `reddit_posts`, and `reddit_comments`.

## Scheduler

`server/scheduler.ts` runs every 60s, dispatching fetch for each active account by platform. First run is delayed 60-90s (jittered) to avoid hammering APIs on restart.

## Authenticated OAuth / Cookie Storage

Sensitive credentials (auth tokens, OAuth refresh tokens, Reddit cookies) are encrypted at rest using AES-256-GCM with a key derived from a random 32-byte seed stored in `data/config.json`. The encryption key is loaded once at startup via `bootstrap()`.
