import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OverviewStats, type TimelineData, type Account } from "../api";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { MessageSquare, Heart, Repeat2, Eye, TrendingUp, Star, GitFork, ThumbsUp } from "lucide-react";
import { XIcon, GithubIcon, GitlabIcon, RedditIcon } from "../components/BrandIcons";

type LangColors = Record<string, string>;
const LANG_COLORS: LangColors = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", Ruby: "#701516", C: "#555555", "C++": "#f34b7d",
  "C#": "#178600", Swift: "#F05138", Kotlin: "#A97BFF", PHP: "#4F5D95",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Lua: "#000080",
  Dart: "#00B4AB", Elixir: "#6e4a7e", Haskell: "#5e5086", Zig: "#ec915c",
  OCaml: "#ec6813", Reason: "#ff5847", Makefile: "#427819", Dockerfile: "#384d54",
  CMake: "#DA3434", Roff: "#ecdebe", SCSS: "#c6538c", Vue: "#41b883",
  Svelte: "#ff3e00", Astro: "#ff5a03", MDX: "#fcb32c", Nix: "#7e7eff",
  HCL: "#844FBA", JSON: "#292929", YAML: "#cb171e", TOML: "#9c4221",
  Markdown: "#083fa1", JupyterNotebook: "#DA5B0B",
};
function languageColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#6e7681";
}

// ── shared repo/project chip ────────────────────────────────────
function RepoChip({ name, language, stars, forks, onClick }: {
  name: string; language: string | null; stars: number; forks: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-left min-w-0"
    >
      {language && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: languageColor(language) }} />}
      <span className="text-xs font-medium truncate">{name}</span>
      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 flex items-center gap-1 ml-auto">
        <span className="flex items-center gap-0.5"><Star size={10} /> {stars.toLocaleString()}</span>
        <span className="flex items-center gap-0.5"><GitFork size={10} /> {forks.toLocaleString()}</span>
      </span>
    </button>
  );
}

export function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const ghOverviews = useQueries({
    queries: ghAccounts.map((acc) => ({
      queryKey: ["github", "overview", acc.id],
      queryFn: () => api.getGithubOverview(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  const glOverviews = useQueries({
    queries: glAccounts.map((acc) => ({
      queryKey: ["gitlab", "overview", acc.id],
      queryFn: () => api.getGitlabOverview(acc.id),
      staleTime: 3 * 60_000,
    })),
  });

  // ── filter Reddit accounts ────────────────────────────────────
  const redditAccounts = allAccounts.filter((a: Account) => a.platform === "reddit");

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

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  // ── aggregate Reddit stats across all accounts ──────────────────
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

  // Karma timeline across accounts
  const karmaByDate = new Map<string, { post: number; comment: number }>();
  for (const d of redditAllTimeline) {
    const cur = karmaByDate.get(d.date) || { post: 0, comment: 0 };
    cur.post += d.post_karma;
    cur.comment += d.comment_karma;
    karmaByDate.set(d.date, cur);
  }
  const redditKarmaTimeline = Array.from(karmaByDate.entries())
    .map(([date, v]) => ({ date, post_karma: v.post, comment_karma: v.comment }))
    .sort((a, b) => a.date.localeCompare(b.date));  const ghAllRepos = ghOverviews.flatMap((o) => o.data?.allRepos ?? []);
  const ghPinned = ghAllRepos.filter((r) => r.pinned);
  const ghTotalStars = ghAllRepos.reduce((s, r) => s + r.stars, 0);
  const ghTotalForks = ghAllRepos.reduce((s, r) => s + r.forks, 0);

  // ── aggregate GL stats across all accounts ──────────────────
  const glAllProjects = glOverviews.flatMap((o) => o.data?.allProjects ?? []);
  const glPinned = glAllProjects.filter((p) => p.pinned);
  const glTotalStars = glAllProjects.reduce((s, p) => s + p.stars, 0);
  const glTotalForks = glAllProjects.reduce((s, p) => s + p.forks, 0);

  return (
    <div className="space-y-4">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("overview.heading")}</h2>
          {allAccounts.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">{t("overview.description_addPrompt")}</p>
          )}
        </div>
        {allAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allAccounts.map((acc) => (
              <Badge key={acc.id} className="text-[10px] px-1.5 py-0.5 gap-0.5">
                {acc.platform === "twitter" ? <XIcon /> : acc.platform === "github" ? <GithubIcon /> : acc.platform === "gitlab" ? <GitlabIcon /> : <RedditIcon />}
                {acc.platform === "twitter" ? `@${acc.screen_name}` : acc.screen_name}
                {acc.error_message && <span className="text-red-500 ml-0.5">!</span>}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* ── X (Twitter) ── */}
      {xAccounts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><XIcon /> {t("overview.xHeading")}</h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <StatCard title={t("overview.stats.tweetCount")} value={stats?.tweet_count ?? 0} icon={<MessageSquare size={16} />} description={stats ? t("overview.stats.today", { count: stats.todayTweets }) : undefined} />
            <StatCard title={t("overview.stats.tweetLikes")} value={(stats?.tweet_likes ?? 0).toLocaleString()} icon={<Heart size={16} />} />
            <StatCard title={t("overview.stats.tweetRetweets")} value={(stats?.tweet_retweets ?? 0).toLocaleString()} icon={<Repeat2 size={16} />} />
            <StatCard title={t("overview.stats.tweetViews")} value={(stats?.tweet_views ?? 0).toLocaleString()} icon={<Eye size={16} />} />
            <StatCard title={t("overview.stats.followers")} value={stats?.followersCount ?? 0} icon={<TrendingUp size={16} />} description={stats ? t("overview.stats.following", { count: stats.followingCount }) : undefined} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard title={t("overview.stats.replyCount")} value={stats?.reply_count ?? 0} icon={<MessageSquare size={16} />} />
            <StatCard title={t("overview.stats.replyLikes")} value={(stats?.reply_likes ?? 0).toLocaleString()} icon={<Heart size={16} />} />
            <StatCard title={t("overview.stats.replyRetweets")} value={(stats?.reply_retweets ?? 0).toLocaleString()} icon={<Repeat2 size={16} />} />
            <StatCard title={t("overview.stats.replyViews")} value={(stats?.reply_views ?? 0).toLocaleString()} icon={<Eye size={16} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.tweetActivity")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
                  <div role="img" aria-label={t("overview.charts.tweetActivity")}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={timeline.dailyTweets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Bar dataKey="tweets_count" fill="var(--primary)" radius={[3, 3, 0, 0]} name={t("overview.charts.tweetsCount")} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noTweetData")}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.dailyEngagement")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
                  <div role="img" aria-label={t("overview.charts.dailyEngagement")}>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={timeline.dailyTweets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="total_likes" stroke="#ec4899" fill="#ec489920" name={t("overview.charts.likes")} />
                      <Area type="monotone" dataKey="total_retweets" stroke="#3b82f6" fill="#3b82f620" name={t("overview.charts.retweets")} />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noEngagementData")}</div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.dailyViews")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
                  <div role="img" aria-label={t("overview.charts.dailyViews")}>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={timeline.dailyTweets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="total_views" stroke="#10b981" fill="#10b98120" name={t("overview.charts.views")} />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noTweetData")}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {topLiked && topLiked.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.charts.topLiked")}</p>
              {topLiked.slice(0, 3).map((tweet) => (
                <div key={tweet.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-[var(--muted)] text-xs">
                  <Heart size={12} className="text-pink-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-1 flex-1">{tweet.full_text}</span>
                  <span className="text-[var(--muted-foreground)] shrink-0">{tweet.favorite_count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {xAccounts.length > 0 && ghAccounts.length > 0 && <Separator className="my-6" />}

      {/* ── GitHub ── */}
      {ghAccounts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><GithubIcon /> {t("overview.githubHeading")}</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard title={t("overview.stats.repos")} value={ghAllRepos.length} icon={<GithubIcon />} />
            <StatCard title={t("overview.stats.totalStars")} value={ghTotalStars} icon={<Star size={16} />} />
            <StatCard title={t("overview.stats.totalForks")} value={ghTotalForks} icon={<GitFork size={16} />} />
            <StatCard title={t("overview.stats.followers")} value={ghOverviews.reduce((s, o) => s + (o.data?.stats?.followers ?? 0), 0)} icon={<TrendingUp size={16} />} />
          </div>

          {ghPinned.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.pinnedRepos")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                {ghPinned.map((repo) => {
                  const acc = ghAccounts.find((a) => a.id === repo.account_id);
                  return (
                    <RepoChip key={repo.id} name={repo.name} language={repo.language} stars={repo.stars} forks={repo.forks}
                      onClick={() => navigate(`/github/${acc?.id ?? repo.account_id}/repos/${repo.repo_id}`)} />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {(xAccounts.length > 0 || ghAccounts.length > 0) && glAccounts.length > 0 && <Separator className="my-6" />}

      {/* ── GitLab ── */}
      {glAccounts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><GitlabIcon /> {t("overview.gitlabHeading")}</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard title={t("overview.stats.projects")} value={glAllProjects.length} icon={<GitlabIcon />} />
            <StatCard title={t("overview.stats.totalStars")} value={glTotalStars} icon={<Star size={16} />} />
            <StatCard title={t("overview.stats.totalForks")} value={glTotalForks} icon={<GitFork size={16} />} />
            <StatCard title={t("overview.stats.followers")} value={glOverviews.reduce((s, o) => s + (o.data?.stats?.followers ?? 0), 0)} icon={<TrendingUp size={16} />} />
          </div>

          {glPinned.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.pinnedProjects")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                {glPinned.map((p) => {
                  const acc = glAccounts.find((a) => a.id === p.account_id);
                  return (
                    <RepoChip key={p.id} name={p.name} language={p.language} stars={p.stars} forks={p.forks}
                      onClick={() => navigate(`/gitlab/${acc?.id ?? p.account_id}/projects/${p.project_id}`)} />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {(xAccounts.length > 0 || ghAccounts.length > 0 || glAccounts.length > 0) && redditAccounts.length > 0 && <Separator className="my-6" />}

      {/* ── Reddit ── */}
      {redditAccounts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><RedditIcon /> {t("overview.redditHeading")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard title={t("overview.stats.postKarma")} value={redditOverviews.reduce((s, o) => s + (o.data?.stats?.post_karma ?? 0), 0)} icon={<ThumbsUp size={16} />} />
            <StatCard title={t("overview.stats.commentKarma")} value={redditOverviews.reduce((s, o) => s + (o.data?.stats?.comment_karma ?? 0), 0)} icon={<MessageSquare size={16} />} />
            <StatCard title={t("overview.stats.redditPosts")} value={redditOverviews.reduce((s, o) => s + (o.data?.totalPosts ?? 0), 0)} icon={<MessageSquare size={16} />} />
            <StatCard title={t("overview.stats.redditComments")} value={redditOverviews.reduce((s, o) => s + (o.data?.totalComments ?? 0), 0)} icon={<MessageSquare size={16} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Karma timeline */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditKarma")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {redditKarmaTimeline.length > 0 ? (
                  <div role="img" aria-label={t("overview.charts.redditKarma")}>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={redditKarmaTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="post_karma" stroke="var(--primary)" strokeWidth={2} dot={false} name={t("overview.charts.redditPostKarma")} />
                      <Line type="monotone" dataKey="comment_karma" stroke="#3b82f6" strokeWidth={2} dot={false} name={t("overview.charts.redditCommentKarma")} />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("redditDetail.noData")}</div>
                )}
              </CardContent>
            </Card>

            {/* Daily activity */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditActivity")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {redditDailyActivity.length > 0 ? (
                  <div role="img" aria-label={t("overview.charts.redditActivity")}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={redditDailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Bar dataKey="posts" fill="var(--primary)" radius={[3, 3, 0, 0]} name={t("overview.stats.redditPosts")} />
                      <Bar dataKey="comments" fill="#f97316" radius={[3, 3, 0, 0]} name={t("overview.stats.redditComments")} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("redditDetail.noData")}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {mergedSubreddits.length > 0 && (
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditSubreddits")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div role="img" aria-label={t("overview.charts.redditSubreddits")}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={mergedSubreddits} dataKey="count" nameKey="subreddit" cx="50%" cy="50%" outerRadius={70} label={(props: { name?: string; value?: number }) => `${props.name ?? ""} (${props.value ?? 0})`} labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 0.5 }}>
                      {mergedSubreddits.map((_, i) => (
                        <Cell key={i} fill={["var(--primary)", "#3b82f6", "#f97316", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1"][i % 10]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {allAccounts.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] italic">{t("overview.noAccounts")}</p>
      )}
    </div>
  );
}
