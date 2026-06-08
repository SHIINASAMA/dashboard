const API_BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

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

export interface Account {
  id: number;
  screen_name: string;
  platform: string;
  user_id: string | null;
  fetch_interval: number;
  is_active: number;
  last_fetched_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  stats?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  } | null;
}

export interface AccountsResponse {
  accounts: Account[];
  overview: OverviewStats;
}

// ─── GitHub types ───────────────────────────────────────────────

export interface GithubOverview {
  stats: {
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
  } | null;
  repos: GithubRepo[];
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
  created_at: string;
}

export interface GithubContribution {
  date: string;
  count: number;
  level: number;
}

// ─── API methods ────────────────────────────────────────────────

export const api = {
  // Accounts
  getAccounts: () => fetchJSON<AccountsResponse>("/accounts"),
  getAccount: (id: number) => fetchJSON<Account & { stats: any }>(`/accounts/${id}`),
  createAccount: (data: { screenName: string; authToken: string; fetchInterval?: number; platform?: string }) =>
    fetchJSON<Account>("/accounts", { method: "POST", body: JSON.stringify(data) }),
  updateAccount: (id: number, data: { screenName?: string; authToken?: string; fetchInterval?: number; isActive?: boolean }) =>
    fetchJSON<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAccount: (id: number) => fetchJSON<{ success: boolean }>(`/accounts/${id}`, { method: "DELETE" }),
  triggerFetch: (id: number) => fetchJSON<{ message: string }>(`/fetch/${id}`, { method: "POST" }),

  // Twitter
  getOverview: () => fetchJSON<OverviewStats>("/stats/overview"),
  getTweets: (page = 1, limit = 20, sort = "created_at", order = "desc", search?: string, accountIds?: number[]) => {
    let url = `/tweets?page=${page}&limit=${limit}&sort=${sort}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (accountIds?.length) url += `&accountIds=${accountIds.join(",")}`;
    return fetchJSON<PaginatedTweets>(url);
  },
  getTweet: (id: string) => fetchJSON<Tweet>(`/tweets/${id}`),
  getTimeline: (months = 6) => fetchJSON<TimelineData>(`/stats/timeline?months=${months}`),
  getTopTweets: (metric = "favorite_count", limit = 10) =>
    fetchJSON<Tweet[]>(`/stats/top?metric=${metric}&limit=${limit}`),
  getCalendar: (year?: number) =>
    fetchJSON<CalendarDay[]>(`/stats/calendar?year=${year || new Date().getFullYear()}`),

  // GitHub
  getGithubOverview: (accountId: number) => fetchJSON<GithubOverview>(`/github/overview/${accountId}`),
  getGithubTimeline: (accountId: number) => fetchJSON<{ date: string; public_repos: number; followers: number; following: number }[]>(`/github/timeline/${accountId}`),
  getGithubContributions: (accountId: number, year?: number) =>
    fetchJSON<GithubContribution[]>(`/github/contributions/${accountId}${year ? `?year=${year}` : ""}`),
};
