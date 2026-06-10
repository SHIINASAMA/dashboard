const API_BASE = import.meta.env.BASE_URL + "api";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    const msg = body.error || `API error: ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return res.json() as T;
}

import type {
  Account, AccountWithStats, AccountsResponse, OverviewStats,
  Tweet, PaginatedTweets, TimelineData, CalendarDay,
  GithubContribution, GithubOverview, GithubRepo, GithubRelease,
  GitlabContribution, GitlabOverview, GitlabProject, GitlabRelease,
  RedditOverview, RedditPost, RedditComment, PaginatedRedditPosts, PaginatedRedditComments,
  LoginResponse, AuthCheckResponse, UserPublic,
} from "@shared/types";

export type {
  Account, AccountWithStats, AccountsResponse, OverviewStats,
  Tweet, PaginatedTweets, TimelineData, CalendarDay,
  GithubContribution, GithubOverview, GithubRepo, GithubRelease,
  GitlabContribution, GitlabOverview, GitlabProject, GitlabRelease,
  RedditOverview, RedditPost, RedditComment, PaginatedRedditPosts, PaginatedRedditComments,
  LoginResponse, AuthCheckResponse, UserPublic,
};

// ─── API methods ────────────────────────────────────────────────

export const api = {
  // Accounts
  getAccounts: () => fetchJSON<AccountsResponse>("/accounts"),
  getAccount: (id: number) => fetchJSON<AccountWithStats>(`/accounts/${id}`),
  createAccount: (data: { screenName: string; authToken?: string; fetchInterval?: number; platform?: string; instanceUrl?: string | null; authType?: string | null }) =>
    fetchJSON<Account>("/accounts", { method: "POST", body: JSON.stringify(data) }),
  updateAccount: (id: number, data: { screenName?: string; authToken?: string; fetchInterval?: number; isActive?: boolean; instanceUrl?: string; authType?: string }) =>
    fetchJSON<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  triggerFetch: (id: number) => fetchJSON<{ message: string }>(`/fetch/${id}`, { method: "POST" }),

  // Twitter
  getOverview: () => fetchJSON<OverviewStats>("/stats/overview"),
  getTweets: (page = 1, limit = 20, sort = "created_at", order = "desc", search?: string, accountIds?: number[], isReply?: number) => {
    let url = `/tweets?page=${page}&limit=${limit}&sort=${sort}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (accountIds?.length) url += `&accountIds=${accountIds.join(",")}`;
    if (isReply !== undefined) url += `&isReply=${isReply}`;
    return fetchJSON<PaginatedTweets>(url);
  },
  getTweet: (id: string) => fetchJSON<Tweet>(`/tweets/${id}`),
  getTimeline: (months = 6, accountId?: number) => {
    let url = `/stats/timeline?months=${months}`;
    if (accountId) url += `&accountIds=${accountId}`;
    return fetchJSON<TimelineData>(url);
  },
  getTopTweets: (metric = "favorite_count", limit = 10) =>
    fetchJSON<Tweet[]>(`/stats/top?metric=${metric}&limit=${limit}`),
  getCalendar: (year?: number) =>
    fetchJSON<CalendarDay[]>(`/stats/calendar?year=${year || new Date().getFullYear()}`),

  // GitHub
  getGithubOverview: (accountId: number) => fetchJSON<GithubOverview>(`/github/overview/${accountId}`),
  getGithubTimeline: (accountId: number) => fetchJSON<{ date: string; public_repos: number; followers: number; following: number }[]>(`/github/timeline/${accountId}`),
  getGithubContributions: (accountId: number, year?: number) =>
    fetchJSON<GithubContribution[]>(`/github/contributions/${accountId}${year ? `?year=${year}` : ""}`),

  // GitHub Repo Insights
  getGithubRepoSnapshots: (accountId: number, repoId: number) =>
    fetchJSON<{ stars: number; forks: number; open_issues: number; date: string }[]>(`/github/${accountId}/repos/${repoId}/snapshots`),
  getGithubTrafficClones: (accountId: number, repoId: number) =>
    fetchJSON<{ date: string; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/clones`),
  getGithubTrafficViews: (accountId: number, repoId: number) =>
    fetchJSON<{ date: string; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/views`),
  getGithubReferrers: (accountId: number, repoId: number) =>
    fetchJSON<{ snapshot_date: string; referrer: string; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/referrers`),
  getGithubReferrerHistory: (accountId: number, repoId: number) =>
    fetchJSON<{ snapshot_date: string; referrer: string; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/referrers/history`),
  getGithubPaths: (accountId: number, repoId: number) =>
    fetchJSON<{ snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/paths`),
  getGithubPathHistory: (accountId: number, repoId: number) =>
    fetchJSON<{ snapshot_date: string; path: string; title: string | null; count: number; uniques: number }[]>(`/github/${accountId}/repos/${repoId}/paths/history`),
  getGithubReleases: (accountId: number, repoId: number) =>
    fetchJSON<GithubRelease[]>(`/github/${accountId}/repos/${repoId}/releases`),
  setPinnedRepos: (accountId: number, repoIds: number[]) =>
    fetchJSON<{ ok: boolean }>(`/github/repos/pin`, { method: "PUT", body: JSON.stringify({ accountId, repoIds }) }),

  // GitLab
  getGitlabOverview: (accountId: number) => fetchJSON<GitlabOverview>(`/gitlab/overview/${accountId}`),
  getGitlabTimeline: (accountId: number) => fetchJSON<{ date: string; public_projects: number; followers: number; following: number }[]>(`/gitlab/timeline/${accountId}`),
  getGitlabContributions: (accountId: number, year?: number) =>
    fetchJSON<GitlabContribution[]>(`/gitlab/contributions/${accountId}${year ? `?year=${year}` : ""}`),

  // GitLab Project Insights
  getGitlabProjectSnapshots: (accountId: number, projectId: number) =>
    fetchJSON<{ stars: number; forks: number; open_issues: number; date: string }[]>(`/gitlab/${accountId}/projects/${projectId}/snapshots`),
  getGitlabReleases: (accountId: number, projectId: number) =>
    fetchJSON<GitlabRelease[]>(`/gitlab/${accountId}/projects/${projectId}/releases`),
  setPinnedGitlabProjects: (accountId: number, projectIds: number[]) =>
    fetchJSON<{ ok: boolean }>(`/gitlab/projects/pin`, { method: "PUT", body: JSON.stringify({ accountId, projectIds }) }),

  // Reddit
  getRedditOverview: (accountId: number) => fetchJSON<RedditOverview>(`/reddit/overview/${accountId}`),
  getRedditTimeline: (accountId: number) => fetchJSON<{ date: string; post_karma: number; comment_karma: number }[]>(`/reddit/timeline/${accountId}`),
  getRedditPosts: (accountId: number, page = 1, limit = 20, sort = "score") =>
    fetchJSON<PaginatedRedditPosts>(`/reddit/posts/${accountId}?page=${page}&limit=${limit}&sort=${sort}`),
  getRedditComments: (accountId: number, page = 1, limit = 20) =>
    fetchJSON<PaginatedRedditComments>(`/reddit/comments/${accountId}?page=${page}&limit=${limit}`),
  getRedditActivity: (accountId: number) =>
    fetchJSON<{ posts: { date: string; count: number }[]; comments: { date: string; count: number }[] }>(`/reddit/activity/${accountId}`),
  getRedditSubreddits: (accountId: number) =>
    fetchJSON<{ subreddit: string; count: number }[]>(`/reddit/subreddits/${accountId}`),

  login: (username: string, password: string) =>
    fetchJSON<{ ok: boolean; user?: string; role?: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  checkAuth: () =>
    fetchJSON<{ authenticated: boolean; username?: string; role?: string }>("/auth/me"),
  logout: () => fetchJSON<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchJSON<{ ok: boolean }>("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Users (admin only)
  getUsers: () => fetchJSON<{ users: { id: number; username: string; role: string; created_at: string }[] }>("/users"),
  createUser: (data: { username: string; password: string; role?: string }) =>
    fetchJSON("/users", { method: "POST", body: JSON.stringify(data) }),
  deleteUser: (id: number, confirmToken: string) =>
    fetchJSON<{ ok: boolean }>(`/users/${id}`, { method: "DELETE", body: JSON.stringify({ confirmToken }) }),

  // Confirmation tokens
  getConfirmToken: () => fetchJSON<{ token: string }>("/confirm/token", { method: "POST" }),
  deleteAccount: (id: number, confirmToken?: string) =>
    fetchJSON<{ success: boolean }>(`/accounts/${id}`, { method: "DELETE", body: JSON.stringify({ confirmToken: confirmToken ?? "" }) }),
};
