# API Reference

Base path: `/api` (configurable via `BASE` in server config)

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate with `{ username, password }`, sets session cookie |
| GET | `/auth/me` | Check current session → `{ authenticated, username, role }` |
| POST | `/auth/logout` | Clear session cookie |
| POST | `/auth/change-password` | Change password `{ currentPassword, newPassword }` (requires session) |

## Users (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (no password hashes) |
| POST | `/users` | Create user `{ username, password, role? }` |
| DELETE | `/users/:id` | Soft-delete user + all their accounts (requires `{ confirmToken }`) |

## Confirmation Tokens

| Method | Path | Description |
|--------|------|-------------|
| POST | `/confirm/token` | Get a 6-character HMAC-signed one-time token (5-minute TTL) |

## Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List all accounts + overview stats |
| GET | `/accounts/:id` | Get account (without auth_token) + latest stats |
| POST | `/accounts` | Create account `{ screenName, authToken, fetchInterval, platform?, instanceUrl?, authType? }` |
| PUT | `/accounts/:id` | Update account fields |
| DELETE | `/accounts/:id` | Delete account + all related data (requires `{ confirmToken }`) |

## X (Twitter)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/overview` | Aggregated tweet stats (totals, today, followers) |
| GET | `/tweets?page=&limit=&sort=&order=&search=&accountIds=` | Paginated tweets with search/sort/account filter |
| GET | `/tweets/:id` | Single tweet |
| GET | `/stats/timeline?months=6` | Daily tweet counts + follower growth |
| GET | `/stats/top?metric=&limit=10` | Top tweets by metric (favorite_count, retweet_count, etc.) |
| GET | `/stats/calendar?year=` | Tweet calendar heatmap data |

## GitHub

| Method | Path | Description |
|--------|------|-------------|
| GET | `/github/overview/:accountId` | Profile stats + repos + languages + top repos |
| GET | `/github/timeline/:accountId` | Follower/repo count over time |
| GET | `/github/contributions/:accountId?year=` | Contribution calendar |
| GET | `/github/:accountId/repos/:repoId/snapshots` | Star/fork/open_issues snapshots |
| GET | `/github/:accountId/repos/:repoId/clones` | Daily clone counts |
| GET | `/github/:accountId/repos/:repoId/views` | Daily page views |
| GET | `/github/:accountId/repos/:repoId/referrers` | Top referring sites |
| GET | `/github/:accountId/repos/:repoId/referrers/history` | Referrer history over time |
| GET | `/github/:accountId/repos/:repoId/paths` | Popular content paths |
| GET | `/github/:accountId/repos/:repoId/paths/history` | Path history over time |
| GET | `/github/:accountId/repos/:repoId/releases` | Releases with download stats |
| PUT | `/github/repos/pin` | Set pinned repos `{ accountId, repoIds }` |

## GitLab

| Method | Path | Description |
|--------|------|-------------|
| GET | `/gitlab/overview/:accountId` | Profile stats + projects |
| GET | `/gitlab/timeline/:accountId` | Follower/project count over time |
| GET | `/gitlab/contributions/:accountId?year=` | Contribution calendar |
| GET | `/gitlab/:accountId/projects/:projectId/snapshots` | Star/fork snapshots |
| GET | `/gitlab/:accountId/projects/:projectId/releases` | Releases with download stats |
| PUT | `/gitlab/projects/pin` | Set pinned projects `{ accountId, projectIds }` |

## Reddit

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reddit/overview/:accountId` | Karma stats + post/comment counts + top posts |
| GET | `/reddit/timeline/:accountId` | Karma timeline (post + comment karma) |
| GET | `/reddit/posts/:accountId?page=&limit=&sort=` | Paginated posts |
| GET | `/reddit/comments/:accountId?page=&limit=` | Paginated comments |
| GET | `/reddit/activity/:accountId` | Daily post + comment activity counts |
| GET | `/reddit/subreddits/:accountId` | Subreddit distribution |

## Fetch API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/fetch/:id` | Trigger an immediate fetch for a specific account |
