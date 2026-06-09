// Re-export from Drizzle query layer for backward compatibility
export * from "./db/queries";

// Re-export types for direct consumers
export type {
  TweetRow, UserStatsRow, DailyStatsRow,
  GithubStatsRow, GithubRepoRow, GithubContributionRow,
  GitlabStatsRow, GitlabProjectRow,
  RedditStatsRow, RedditPostRow, RedditCommentRow,
} from "./db/queries/types";

// GitHub queries (raw SQL stubs, Drizzle migration pending)
export {
  getGithubOverview, getGithubStatsTimeline, getGithubContributions,
  upsertGithubRepo, setPinnedRepos, insertGithubStats, upsertGithubContribution,
  upsertGithubRepoSnapshot, getGithubRepoSnapshots,
  upsertGithubTrafficClones, getGithubTrafficClones,
  upsertGithubTrafficViews, getGithubTrafficViews,
  upsertGithubReferrer, getGithubReferrers, getGithubReferrerHistory,
  upsertGithubPath, getGithubPaths, getGithubPathHistory,
  upsertGithubRelease, getGithubReleases, insertGithubReleaseAsset,
} from "./db/queries/github";

// GitLab queries (raw SQL stubs, Drizzle migration pending)
export {
  getGitlabOverview, getGitlabStatsTimeline, getGitlabContributions,
  upsertGitlabProject, setPinnedGitlabProjects, insertGitlabStats,
  upsertGitlabContribution, upsertGitlabProjectSnapshot, getGitlabProjectSnapshots,
  upsertGitlabRelease, getGitlabReleases, insertGitlabReleaseAsset,
} from "./db/queries/gitlab";

// Reddit queries (raw SQL stubs, Drizzle migration pending)
export {
  insertRedditStats, getRedditStatsTimeline, upsertRedditPost, upsertRedditComment,
  getRedditPosts, getRedditComments, getRedditOverview, getRedditDailyActivity,
  getRedditSubredditDistribution, getRedditDailyCommentActivity,
} from "./db/queries/reddit";
