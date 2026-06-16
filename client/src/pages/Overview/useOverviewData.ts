import { useQuery, useQueries } from "@tanstack/react-query";
import { api, type OverviewStats, type TimelineData, type Account } from "../../api";

export function useOverviewData() {
  const { data: stats, isLoading } = useQuery<OverviewStats>({
    queryKey: ["overview"],
    queryFn: api.getOverview,
    refetchInterval: 3 * 60_000,
  });

  const { data: timeline } = useQuery<TimelineData>({
    queryKey: ["timeline", 6],
    queryFn: () => api.getTimeline(6),
  });

  const { data: topLiked } = useQuery({
    queryKey: ["top", "favorite_count", 5],
    queryFn: () => api.getTopTweets("favorite_count", 5),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 3 * 60_000,
  });

  const allAccounts = accountsData?.accounts || [];
  const xAccounts = allAccounts.filter((a: Account) => a.platform === "twitter");
  const ghAccounts = allAccounts.filter((a: Account) => a.platform === "github");
  const glAccounts = allAccounts.filter((a: Account) => a.platform === "gitlab");
  const redditAccounts = allAccounts.filter((a: Account) => a.platform === "reddit");

  // ── GitHub ──
  const ghOverviews = useQueries({
    queries: ghAccounts.map((acc) => ({
      queryKey: ["github", "overview", acc.id],
      queryFn: () => api.getGithubOverview(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const ghAllRepos = ghOverviews.flatMap((o) => o.data?.allRepos ?? []);
  const ghPinned = ghAllRepos.filter((r) => r.pinned);
  const ghTotalStars = ghAllRepos.reduce((s, r) => s + r.stars, 0);
  const ghTotalForks = ghAllRepos.reduce((s, r) => s + r.forks, 0);

  // ── GitLab ──
  const glOverviews = useQueries({
    queries: glAccounts.map((acc) => ({
      queryKey: ["gitlab", "overview", acc.id],
      queryFn: () => api.getGitlabOverview(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const glAllProjects = glOverviews.flatMap((o) => o.data?.allProjects ?? []);
  const glPinned = glAllProjects.filter((p) => p.pinned);
  const glTotalStars = glAllProjects.reduce((s, p) => s + p.stars, 0);
  const glTotalForks = glAllProjects.reduce((s, p) => s + p.forks, 0);

  // ── Reddit ──
  const redditOverviews = useQueries({
    queries: redditAccounts.map((acc) => ({
      queryKey: ["reddit", "overview", acc.id],
      queryFn: () => api.getRedditOverview(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const redditTimelines = useQueries({
    queries: redditAccounts.map((acc) => ({
      queryKey: ["reddit", "timeline", acc.id],
      queryFn: () => api.getRedditTimeline(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const redditActivities = useQueries({
    queries: redditAccounts.map((acc) => ({
      queryKey: ["reddit", "activity", acc.id],
      queryFn: () => api.getRedditActivity(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const redditSubreddits = useQueries({
    queries: redditAccounts.map((acc) => ({
      queryKey: ["reddit", "subreddits", acc.id],
      queryFn: () => api.getRedditSubreddits(acc.id),
      staleTime: 30_000,
    })),
  });

  // ── aggregate Reddit data across accounts ──
  const redditAllTimeline = redditTimelines.flatMap((o) => o.data ?? []);
  const redditAllActivityPosts = redditActivities.flatMap((o) => o.data?.posts ?? []);
  const redditAllActivityComments = redditActivities.flatMap((o) => o.data?.comments ?? []);
  const redditAllSubreddits = redditSubreddits.flatMap((o) => o.data ?? []);

  // Merge daily activity across accounts by date
  const redditDailyMap = new Map<string, { posts: number; comments: number }>();
  for (const d of redditAllActivityPosts) {
    const cur = redditDailyMap.get(d.date) || { posts: 0, comments: 0 };
    cur.posts += d.count;
    redditDailyMap.set(d.date, cur);
  }
  for (const d of redditAllActivityComments) {
    const cur = redditDailyMap.get(d.date) || { posts: 0, comments: 0 };
    cur.comments += d.count;
    redditDailyMap.set(d.date, cur);
  }
  const redditDailyActivity = Array.from(redditDailyMap.entries())
    .map(([date, v]) => ({ date, posts: v.posts, comments: v.comments }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Merge subreddit counts across accounts
  const subredditMap = new Map<string, number>();
  for (const s of redditAllSubreddits) {
    subredditMap.set(s.subreddit, (subredditMap.get(s.subreddit) ?? 0) + s.count);
  }
  const mergedSubreddits = Array.from(subredditMap.entries())
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Karma timeline across accounts — each account's timeline already returns
  // one row per date (latest snapshot), so just sum across accounts per date
  const karmaByDate = new Map<string, { post: number; comment: number }>();
  for (const d of redditAllTimeline) {
    const cur = karmaByDate.get(d.date) || { post: 0, comment: 0 };
    cur.post += d.post_karma;
    cur.comment += d.comment_karma;
    karmaByDate.set(d.date, cur);
  }
  const redditKarmaTimeline = Array.from(karmaByDate.entries())
    .map(([date, v]) => ({ date, post_karma: v.post, comment_karma: v.comment }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    stats,
    timeline,
    topLiked,
    allAccounts,
    xAccounts,
    ghAccounts,
    glAccounts,
    redditAccounts,
    ghOverviews,
    ghAllRepos,
    ghPinned,
    ghTotalStars,
    ghTotalForks,
    glOverviews,
    glAllProjects,
    glPinned,
    glTotalStars,
    glTotalForks,
    redditOverviews,
    redditKarmaTimeline,
    redditDailyActivity,
    mergedSubreddits,
    isLoading,
  };
}
