export type TopContentPlatform = "twitter" | "github" | "gitlab" | "reddit";

export type TopContentKind =
  | "tweet"
  | "reddit_post"
  | "reddit_comment"
  | "release"
  | "repo_growth";

/**
 * A single ranked item on the content leaderboard. Native metrics are kept
 * per platform; growthRate is only populated when snapshot baselines exist.
 */
export interface TopContentItem {
  id: string;
  kind: TopContentKind;
  platform: TopContentPlatform;
  title: string;
  subtitle: string | null;
  accountId: number;
  accountName: string;
  createdAt: string;
  url: string;
  route: string | null;

  metricLabel: string;
  metricValue: number;
  secondaryLabel: string | null;
  secondaryValue: number | null;

  /** Percentage change within the window, or null when no baseline exists. */
  growthRate: number | null;
}

export interface TopContentResponse {
  range: { days: number; since: string; until: string };
  items: TopContentItem[];
}

export interface TopContentInput {
  generatedAt: string;
  days: number;
  limitPerKind?: number;
  tweets: Array<{
    id: string; account_id: number; accountName: string;
    full_text: string; created_at: string;
    favorite_count: number; retweet_count: number; reply_count: number;
  }>;
  redditPosts: Array<{
    id: string; account_id: number; accountName: string;
    title: string; subreddit: string; score: number; num_comments: number;
    permalink: string; created_utc: number;
  }>;
  redditComments: Array<{
    id: string; account_id: number; accountName: string;
    body: string; subreddit: string; score: number;
    permalink: string; created_utc: number;
  }>;
  releases: Array<{
    id: string; platform: "github" | "gitlab"; accountId: number; accountName: string;
    repoOrProjectId: number; repoName: string; tagName: string;
    title: string | null; publishedAt: string | null;
    totalDownloads: number; htmlUrl: string;
  }>;
  repositories: Array<{
    platform: "github" | "gitlab"; accountId: number; externalId: number;
    accountName: string; name: string; fullName: string;
    stars: number; forks: number; baselineStars: number; baselineForks: number;
    url: string;
  }>;
}

const KIND_ORDER: Record<TopContentKind, number> = {
  tweet: 0,
  reddit_post: 1,
  reddit_comment: 2,
  release: 3,
  repo_growth: 4,
};

function pct(baseline: number, current: number): number | null {
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function buildTopContent(input: TopContentInput): TopContentResponse {
  const sinceDate = new Date(Date.parse(input.generatedAt) - input.days * 86_400_000);
  const sinceMs = sinceDate.getTime();
  const untilMs = Date.parse(input.generatedAt);
  const limit = input.limitPerKind ?? 5;

  const items: TopContentItem[] = [];

  for (const row of input.tweets) {
    if (Date.parse(row.created_at) < sinceMs || Date.parse(row.created_at) >= untilMs) continue;
    items.push({
      id: `tweet:${row.id}`,
      kind: "tweet",
      platform: "twitter",
      title: row.full_text,
      subtitle: null,
      accountId: row.account_id,
      accountName: row.accountName,
      createdAt: row.created_at,
      url: `https://x.com/${row.accountName}/status/${row.id}`,
      route: `/x/${row.account_id}`,
      metricLabel: "engagement",
      metricValue: (row.favorite_count ?? 0) + (row.retweet_count ?? 0) + (row.reply_count ?? 0),
      secondaryLabel: null,
      secondaryValue: null,
      growthRate: null,
    });
  }

  for (const row of input.redditPosts) {
    const ms = row.created_utc * 1000;
    if (ms < sinceMs || ms >= untilMs) continue;
    items.push({
      id: `reddit_post:${row.id}`,
      kind: "reddit_post",
      platform: "reddit",
      title: row.title,
      subtitle: `r/${row.subreddit}`,
      accountId: row.account_id,
      accountName: row.accountName,
      createdAt: new Date(ms).toISOString(),
      url: `https://reddit.com${row.permalink}`,
      route: `/reddit/${row.account_id}`,
      metricLabel: "score",
      metricValue: row.score ?? 0,
      secondaryLabel: "comments",
      secondaryValue: row.num_comments ?? 0,
      growthRate: null,
    });
  }

  for (const row of input.redditComments) {
    const ms = row.created_utc * 1000;
    if (ms < sinceMs || ms >= untilMs) continue;
    items.push({
      id: `reddit_comment:${row.id}`,
      kind: "reddit_comment",
      platform: "reddit",
      title: row.body,
      subtitle: `r/${row.subreddit}`,
      accountId: row.account_id,
      accountName: row.accountName,
      createdAt: new Date(ms).toISOString(),
      url: `https://reddit.com${row.permalink}`,
      route: `/reddit/${row.account_id}`,
      metricLabel: "score",
      metricValue: row.score ?? 0,
      secondaryLabel: null,
      secondaryValue: null,
      growthRate: null,
    });
  }

  for (const row of input.releases) {
    if (!row.publishedAt) continue;
    const ms = Date.parse(row.publishedAt);
    if (Number.isNaN(ms) || ms < sinceMs || ms >= untilMs) continue;
    items.push({
      id: `release:${row.platform}:${row.id}`,
      kind: "release",
      platform: row.platform,
      title: row.title || row.tagName,
      subtitle: row.repoName,
      accountId: row.accountId,
      accountName: row.accountName,
      createdAt: row.publishedAt,
      url: row.htmlUrl,
      route: row.platform === "github"
        ? `/github/${row.accountId}/repos/${row.repoOrProjectId}`
        : `/gitlab/${row.accountId}/projects/${row.repoOrProjectId}`,
      metricLabel: "downloads",
      metricValue: row.totalDownloads ?? 0,
      secondaryLabel: null,
      secondaryValue: null,
      growthRate: null,
    });
  }

  for (const row of input.repositories) {
    const starChange = row.stars - row.baselineStars;
    const forkChange = row.forks - row.baselineForks;
    if (starChange === 0 && forkChange === 0) continue;
    const rate = pct(row.baselineStars, row.stars);
    items.push({
      id: `repo_growth:${row.platform}:${row.accountId}:${row.externalId}`,
      kind: "repo_growth",
      platform: row.platform,
      title: row.name,
      subtitle: row.fullName,
      accountId: row.accountId,
      accountName: row.accountName,
      createdAt: input.generatedAt,
      url: row.url,
      route: row.platform === "github"
        ? `/github/${row.accountId}/repos/${row.externalId}`
        : `/gitlab/${row.accountId}/projects/${row.externalId}`,
      metricLabel: "starGrowth",
      metricValue: starChange,
      secondaryLabel: "forks",
      secondaryValue: forkChange,
      growthRate: rate,
    });
  }

  // Rank by primary metric descending, break ties by kind order then recency.
  items.sort((a, b) =>
    b.metricValue - a.metricValue
    || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return {
    range: { days: input.days, since: sinceDate.toISOString(), until: input.generatedAt },
    items: items.slice(0, limit * Object.keys(KIND_ORDER).length),
  };
}
