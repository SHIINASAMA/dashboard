export type PulsePlatform = "twitter" | "github" | "gitlab" | "reddit";

export interface PulseMetricDelta {
  current: number;
  previous: number;
  change: number;
}

export interface PulseAccount {
  id: number;
  screen_name: string;
  platform: string;
  instance_url?: string | null;
  is_active?: number | boolean;
}

export interface PulseAudienceSample {
  account_id: number;
  value: number;
}

export interface PulseAudienceSamples {
  current: PulseAudienceSample[];
  previous: PulseAudienceSample[];
}

export interface PulseActivityCount {
  current: number;
  previous: number;
}

export interface PulseTweetRow {
  id: string;
  account_id: number;
  accountName: string;
  full_text: string;
  created_at: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
}

export interface PulseRedditPostRow {
  id: string;
  account_id: number;
  accountName: string;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
}

export interface PulseRedditCommentRow {
  id: string;
  account_id: number;
  accountName: string;
  body: string;
  subreddit: string;
  score: number;
  permalink: string;
  created_utc: number;
}

export interface PulseRepositoryRow {
  account_id: number;
  platform: "github" | "gitlab";
  externalId: number;
  accountName: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  baselineStars: number;
  baselineForks: number;
  url: string;
}

export interface PulsePlatformSummary {
  platform: PulsePlatform;
  audienceMetric: "followers" | "karma";
  audience: PulseMetricDelta;
  activity: PulseMetricDelta & {
    tweets: number;
    posts: number;
    comments: number;
    contributions: number;
  };
}

export interface PulseContentItem {
  id: string;
  platform: PulsePlatform;
  kind: "tweet" | "reddit_post" | "reddit_comment";
  title: string;
  subtitle: string | null;
  metricValue: number;
  secondaryValue: number;
  url: string;
  accountId: number;
  accountName: string;
  createdAt: string;
}

export interface PulseRepositoryItem {
  id: string;
  platform: "github" | "gitlab";
  kind: "repo" | "project";
  accountId: number;
  accountName: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  starChange: number;
  forks: number;
  forkChange: number;
  url: string;
  route: string;
}

export interface PulseResponse {
  range: { days: number; since: string; until: string };
  totals: {
    activity: PulseMetricDelta;
    traction: { stars: PulseMetricDelta; forks: PulseMetricDelta };
  };
  platforms: PulsePlatformSummary[];
  content: {
    tweets: PulseContentItem[];
    redditPosts: PulseContentItem[];
    redditComments: PulseContentItem[];
  };
  repositories: PulseRepositoryItem[];
}

export interface PulseInput {
  generatedAt: string;
  days: number;
  accounts: PulseAccount[];
  audience: Partial<Record<PulsePlatform, PulseAudienceSamples>>;
  activity: {
    tweets: PulseActivityCount;
    redditPosts: PulseActivityCount;
    redditComments: PulseActivityCount;
    githubContributions: PulseActivityCount;
    gitlabContributions: PulseActivityCount;
  };
  tweets: PulseTweetRow[];
  redditPosts: PulseRedditPostRow[];
  redditComments: PulseRedditCommentRow[];
  repositories: PulseRepositoryRow[];
}

const PLATFORM_ORDER: PulsePlatform[] = ["twitter", "github", "gitlab", "reddit"];

export function metricDelta(current: number, previous: number): PulseMetricDelta {
  return { current, previous, change: current - previous };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function audienceDelta(
  samples: PulseAudienceSamples | undefined,
  accountIds: number[],
): PulseMetricDelta {
  const currentByAccount = new Map(samples?.current.map((sample) => [sample.account_id, sample.value]));
  const previousByAccount = new Map(samples?.previous.map((sample) => [sample.account_id, sample.value]));

  // A single sample cannot establish a window delta. Treating the missing side
  // as zero would turn onboarding or a collection gap into fake growth.
  let current = 0;
  let previous = 0;
  for (const id of accountIds) {
    const currentValue = currentByAccount.get(id);
    const previousValue = previousByAccount.get(id);
    if (currentValue === undefined || previousValue === undefined) continue;
    current += currentValue;
    previous += previousValue;
  }
  return metricDelta(current, previous);
}

function toTweetItem(row: PulseTweetRow): PulseContentItem {
  return {
    id: row.id,
    platform: "twitter",
    kind: "tweet",
    title: row.full_text,
    subtitle: null,
    metricValue: row.favorite_count,
    secondaryValue: row.retweet_count + row.reply_count,
    url: `https://x.com/${row.accountName}/status/${row.id}`,
    accountId: row.account_id,
    accountName: row.accountName,
    createdAt: row.created_at,
  };
}

function toRedditPostItem(row: PulseRedditPostRow): PulseContentItem {
  return {
    id: row.id,
    platform: "reddit",
    kind: "reddit_post",
    title: row.title,
    subtitle: `r/${row.subreddit}`,
    metricValue: row.score,
    secondaryValue: row.num_comments,
    url: `https://reddit.com${row.permalink}`,
    accountId: row.account_id,
    accountName: row.accountName,
    createdAt: new Date(row.created_utc * 1000).toISOString(),
  };
}

function toRedditCommentItem(row: PulseRedditCommentRow): PulseContentItem {
  return {
    id: row.id,
    platform: "reddit",
    kind: "reddit_comment",
    title: row.body,
    subtitle: `r/${row.subreddit}`,
    metricValue: row.score,
    secondaryValue: 0,
    url: `https://reddit.com${row.permalink}`,
    accountId: row.account_id,
    accountName: row.accountName,
    createdAt: new Date(row.created_utc * 1000).toISOString(),
  };
}

function toRepositoryItem(row: PulseRepositoryRow): PulseRepositoryItem {
  return {
    id: `${row.platform}:${row.account_id}:${row.externalId}`,
    platform: row.platform,
    kind: row.platform === "github" ? "repo" : "project",
    accountId: row.account_id,
    accountName: row.accountName,
    name: row.name,
    fullName: row.fullName,
    description: row.description,
    stars: row.stars,
    starChange: row.stars - row.baselineStars,
    forks: row.forks,
    forkChange: row.forks - row.baselineForks,
    url: row.url,
    route: row.platform === "github"
      ? `/github/${row.account_id}/repos/${row.externalId}`
      : `/gitlab/${row.account_id}/projects/${row.externalId}`,
  };
}

export function buildPulse(input: PulseInput): PulseResponse {
  const sinceDate = new Date(Date.parse(input.generatedAt) - input.days * 86_400_000);
  const range = {
    days: input.days,
    since: sinceDate.toISOString(),
    until: input.generatedAt,
  };

  const summaries: PulsePlatformSummary[] = [];
  for (const platform of PLATFORM_ORDER) {
    const accounts = input.accounts.filter((account) => account.platform === platform);
    if (accounts.length === 0) continue;
    const ids = accounts.map((account) => account.id);

    let audience: PulseMetricDelta;
    if (platform === "twitter") {
      audience = audienceDelta(input.audience.twitter, ids);
    } else if (platform === "github") {
      audience = audienceDelta(input.audience.github, ids);
    } else if (platform === "gitlab") {
      audience = audienceDelta(input.audience.gitlab, ids);
    } else {
      audience = audienceDelta(input.audience.reddit, ids);
    }

    const breakdown = platform === "twitter"
      ? { tweets: input.activity.tweets.current, posts: 0, comments: 0, contributions: 0 }
      : platform === "reddit"
        ? {
            tweets: 0,
            posts: input.activity.redditPosts.current,
            comments: input.activity.redditComments.current,
            contributions: 0,
          }
        : platform === "github"
          ? {
              tweets: 0, posts: 0, comments: 0,
              contributions: input.activity.githubContributions.current,
            }
          : {
              tweets: 0, posts: 0, comments: 0,
              contributions: input.activity.gitlabContributions.current,
            };

    const previousTotal = platform === "twitter"
      ? input.activity.tweets.previous
      : platform === "reddit"
        ? input.activity.redditPosts.previous + input.activity.redditComments.previous
        : platform === "github"
          ? input.activity.githubContributions.previous
          : input.activity.gitlabContributions.previous;

    summaries.push({
      platform,
      audienceMetric: platform === "reddit" ? "karma" : "followers",
      audience,
      activity: {
        ...breakdown,
        previous: previousTotal,
        current: breakdown.tweets + breakdown.posts + breakdown.comments + breakdown.contributions,
        change: breakdown.tweets + breakdown.posts + breakdown.comments + breakdown.contributions - previousTotal,
      },
    });
  }

  const allRepositoryItems = input.repositories
    .map(toRepositoryItem)
    .sort((a, b) =>
      Math.abs(b.starChange) - Math.abs(a.starChange)
      || Math.abs(b.forkChange) - Math.abs(a.forkChange)
      || b.stars - a.stars,
    );
  const repositoryItems = allRepositoryItems.filter(
    (item) => item.starChange !== 0 || item.forkChange !== 0,
  );
  const content = {
    tweets: input.tweets.slice(0, 5).map(toTweetItem),
    redditPosts: input.redditPosts.slice(0, 5).map(toRedditPostItem),
    redditComments: input.redditComments.slice(0, 5).map(toRedditCommentItem),
  };

  return {
    range,
    totals: {
      activity: metricDelta(
        sum(summaries.map((item) => item.activity.current)),
        sum(summaries.map((item) => item.activity.previous)),
      ),
      traction: {
        stars: metricDelta(
          sum(allRepositoryItems.map((item) => item.stars)),
          sum(allRepositoryItems.map((item) => item.stars - item.starChange)),
        ),
        forks: metricDelta(
          sum(allRepositoryItems.map((item) => item.forks)),
          sum(allRepositoryItems.map((item) => item.forks - item.forkChange)),
        ),
      },
    },
    platforms: summaries,
    content,
    repositories: repositoryItems.slice(0, 5),
  };
}
