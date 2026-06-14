# Scripts

Utility scripts in `scripts/`. Run with `bun run scripts/<name>.ts`.

## dump-x-data.ts

Dumps raw X/Twitter API responses to local files for analysis.

```bash
bun run scripts/dump-x-data.ts
```

Saves data to `data/dumps/<screen_name>/`:
- `01-user-profile.json` — user profile
- `02-user-tweets-page-*.json` — paginated tweet timeline
- `03-user-tweets-replies-page-*.json` — paginated tweets+replies
- `04-tweet-details/<tweet_id>.json` — individual tweet details
- `manifest.json` — summary of collected data

Requires: active Twitter account in database, valid `DASHBOARD_SECRET`.

## test-fetch-algorithm.ts

Tests the X fetcher algorithm against real API data without writing to the database.

```bash
bun run scripts/test-fetch-algorithm.ts
```

Output:
- User profile stats
- Tweet discovery progress (pages, own vs other tweets)
- Tweet detail fetch results
- Summary: tweets, replies, retweets with engagement stats

Useful for verifying the fetcher logic works correctly with live data.

## utils.ts

Shared utilities for scripts:
- `_xClient(token)` — creates an authenticated X/Twitter API client
- Used by both `dump-x-data.ts` and `test-fetch-algorithm.ts`
