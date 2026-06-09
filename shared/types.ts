// ─── Account types ────────────────────────────────────────────────

export interface Account {
  id: number;
  screen_name: string;
  platform: string;
  user_id: string | null;
  instance_url: string | null;
  fetch_interval: number;
  is_active: number;
  last_fetched_at: string | null;
  error_message: string | null;
  auth_type: string | null;
  created_at: string;
  updated_at: string;
  stats?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  } | null;
}

export interface AccountWithStats extends Account {
  stats: NonNullable<Account["stats"]>;
}

export interface AccountsResponse {
  accounts: Account[];
  overview: OverviewStats;
}

// ─── Twitter / X types ───────────────────────────────────────────

export interface OverviewStats {
  total_tweets: number;
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  total_views: number;
  total_bookmarks: number;
  avgEngagement: string;
  followersCount: number;
  followingCount: number;
  userTweetCount: number;
  todayLikes: number;
  todayRetweets: number;
  todayTweets: number;
}

export interface Tweet {
  id: string;
  account_id: number;
  full_text: string;
  created_at: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  view_count: number;
  bookmark_count: number;
  is_quote: number;
  is_reply: number;
  is_retweet: number;
  media_urls: string;
  urls: string;
  hashtags: string;
  mentions: string;
  lang: string;
}

export interface PaginatedTweets {
  data: Tweet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineData {
  dailyTweets: {
    date: string;
    tweets_count: number;
    total_likes: number;
    total_retweets: number;
    total_replies: number;
    total_views: number;
  }[];
  followerGrowth: {
    date: string;
    followers_count: number;
    following_count: number;
    tweet_count: number;
  }[];
}

export interface CalendarDay {
  date: string;
  count: number;
}

// ─── GitHub types ────────────────────────────────────────────────

export interface GithubContribution {
  date: string;
  count: number;
}

export interface GithubOverview {
  stats: {
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
  } | null;
  repos: GithubRepo[];
  allRepos: GithubRepo[];
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  languages: Record<string, number>;
  topRepos: GithubRepo[];
}

export interface GithubRepo {
  id: number;
  account_id: number;
  repo_id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string;
  homepage: string | null;
  is_fork: number;
  pinned: number;
  created_at: string;
}

export interface GithubRelease {
  id: number;
  account_id: number;
  repo_id: number;
  release_id: number;
  tag_name: string | null;
  name: string | null;
  body: string | null;
  prerelease: number;
  published_at: string | null;
  html_url: string | null;
  total_downloads: number;
  fetched_at: string;
}

// ─── GitLab types ────────────────────────────────────────────────

export interface GitlabContribution {
  date: string;
  count: number;
}

export interface GitlabOverview {
  stats: {
    public_projects: number;
    followers: number;
    following: number;
  } | null;
  projects: GitlabProject[];
  allProjects: GitlabProject[];
  totalStars: number;
  totalForks: number;
  totalProjects: number;
  languages: Record<string, number>;
  topProjects: GitlabProject[];
}

export interface GitlabProject {
  id: number;
  account_id: number;
  project_id: number;
  name: string;
  path_with_namespace: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string;
  homepage: string | null;
  is_fork: number;
  pinned: number;
  visibility: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface GitlabRelease {
  id: number;
  account_id: number;
  project_id: number;
  release_tag: string;
  name: string | null;
  description: string | null;
  released_at: string | null;
  created_at: string | null;
  fetched_at: string;
}

// ─── Reddit types ────────────────────────────────────────────────

export interface RedditOverview {
  stats: { post_karma: number; comment_karma: number } | null;
  totalPosts: number;
  totalComments: number;
  totalScore: number;
  topPosts: RedditPost[];
}

export interface RedditPost {
  id: string;
  account_id: number;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  permalink: string;
  url: string;
  is_self: number;
  created_utc: number;
}

export interface RedditComment {
  id: string;
  account_id: number;
  body: string;
  subreddit: string;
  score: number;
  link_id: string;
  parent_id: string | null;
  depth: number;
  permalink: string;
  created_utc: number;
  is_submitter: number;
}

export interface PaginatedRedditPosts {
  data: RedditPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRedditComments {
  data: RedditComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth / User types ───────────────────────────────────────────

export interface LoginResponse {
  ok: boolean;
  user?: string;
  role?: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  username?: string;
  role?: string;
}

export interface UserPublic {
  id: number;
  username: string;
  role: string;
  created_at: string;
}
