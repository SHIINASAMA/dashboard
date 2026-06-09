# Fetchers

The scheduler (`server/scheduler.ts`) runs every 60 seconds, dispatching a single platform per tick in round-robin order. First run is delayed 60–90 seconds (jittered) to avoid hammering APIs on restart.

## X (Twitter) — `server/fetcher.ts`

Uses `twitter-openapi-typescript` library (wraps `twitter-openapi-typescript-generated`). Auth token stored from X.com cookies.

### Fetch flow
1. Fetch user profile → extract stats (followers, following, tweet count)
2. Fetch tweets in batches (batchSize=50, maxTweets=800, 2s delay between batches)
3. Fetch pinned tweets via `legacy.pinnedTweetIdsStr` → `getTweetDetail`
4. Insert/update engagement data

### Rate-limiting
- batchSize=50, maxTweets=800
- 2s delay between batches
- 5s retry wait on 429

### Data stored
- `user_stats` (followers, following, tweet count snapshots)
- `tweets` (with engagement counts)

### Repost counting
X.com UI shows reposts as `retweetCount + quoteCount`. The API separates these; the fetcher stores their sum as `retweet_count`.

## GitHub — `server/fetchers/github.ts`

### Fetch flow
1. User profile stats via REST API
2. Repos list (up to 100)
3. Daily snapshots of star/fork/open_issues counts
4. Traffic data (clones, views, referrers, paths) — requires PAT with repo scope
5. Releases with asset download counts — requires PAT
6. Contribution calendar via GraphQL

### Data stored
- `github_stats` (public_repos, followers, following)
- `github_repos` + `github_repo_snapshots`
- `github_traffic_clones`, `github_traffic_views`, `github_referrers`, `github_paths`
- `github_releases` + `github_release_assets`
- `github_contributions`

Steps 4–5 are silently skipped if no PAT is configured on the account.

## GitLab — `server/fetchers/gitlab.ts`

### Fetch flow
1. User profile stats via GitLab API
2. Projects list with star/fork counts
3. Daily snapshots of star/fork/open_issues counts
4. Releases with asset download counts
5. Contribution calendar

### Data stored
- `gitlab_stats` (public_projects, followers)
- `gitlab_projects` + `gitlab_project_snapshots`
- `gitlab_releases` + `gitlab_release_assets`
- `gitlab_contributions`

## Reddit — `server/fetchers/reddit.ts`

Supports two auth modes:

| Mode | Function | Auth |
|------|----------|------|
| OAuth | `fetchRedditAccount` | Reddit API with refresh-token flow |
| Public | `fetchRedditPublicAccount` | `.reddit` session cookie, no API access needed |

### Fetch flow (both modes)
1. User profile karma stats
2. Posts (up to 100)
3. Comments (up to 100)
4. Subreddit activity distribution

### Data stored
- `reddit_stats` (post_karma, comment_karma)
- `reddit_posts` (title, score, subreddit, etc.)
- `reddit_comments` (body, score, subreddit, etc.)
