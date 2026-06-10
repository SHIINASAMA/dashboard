# Fetchers

The scheduler (`server/scheduler.ts`) runs every 60 seconds, dispatching a single platform per tick in round-robin order. First run is delayed 60–90 seconds (jittered) to avoid hammering APIs on restart.

## X (Twitter) — `server/fetcher.ts`

Uses `twitter-openapi-typescript` library (wraps `twitter-openapi-typescript-generated`). Auth token stored from X.com cookies.

### Fetch flow
1. Fetch user profile via `getUserByScreenName` → extract stats (followers, following, tweet count) + pinned tweet IDs from `legacy.pinnedTweetIdsStr`
2. Discover all own tweets via `getUserTweetsAndReplies`, iterating all pages by cursor until exhausted (batchSize=100, maxTweets=800, 2s delay between pages). Own tweets are **recursively collected** from the timeline entry structure (see below).
3. For every unique own tweet ID (including pinned tweets not found in the timeline):
   - Call `getTweetDetail({ focalTweetId })` to retrieve **real** engagement counts (views, likes, retweets, etc.)
   - `getUserTweetsAndReplies` returns zeroed/absent engagement; only `getTweetDetail` provides correct data
4. Upsert each tweet into `tweets` table

### Timeline entry structure & nested replies

`getUserTweetsAndReplies` returns pages of `data[]` entries. Each entry may contain a **top-level tweet** (`entry.tweet`) AND a **`replies` array** listing replies to that tweet. Reply objects have the same `{ tweet, user, replies }` shape and can themselves contain nested replies (level 2). **Own replies are only found inside other users' `replies` arrays** — they never appear as top-level entries.

**Discovery algorithm (2026-06-10, verified against 82-tweet dump):**
```
for each entry in page.data:
    collectOwn(entry)                           // top-level tweet
    for each reply in entry.replies:
        collectOwn(reply)                       // level-1 nested reply
        for each nr in reply.replies:
            collectOwn(nr)                      // level-2 nested reply
```
where `collectOwn` checks `tweet.legacy.userIdStr === ownUserId`.

Without recursive reply walking, only ~29 of 82 own tweets were found (35%). With it, all 82 were recovered.

### Why not `getUserTweets` endpoint?
- `getUserTweets` returns a subset of `getUserTweetsAndReplies` (no replies to others) and provides **zeroed engagement counts** — the SDK/API no longer returns real values from timeline endpoints
- Only `getTweetDetail` returns real view counts, likes, retweets, etc.
- Therefore `getUserTweets` is not used at all

### Rate-limiting
- batchSize=100, maxTweets=800 (timeline discovery)
- 2s delay between timeline pages, 1s delay between detail calls
- 5s retry wait on 429

### Data stored
- `user_stats` (followers, following, tweet count snapshots)
- `tweets` (with engagement counts)

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
