import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OverviewStats, type TimelineData, type Account } from "../api";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { MessageSquare, Heart, Repeat2, Eye, TrendingUp, ArrowUpRight, Star, GitFork } from "lucide-react";

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

// ── tiny SVG icons reused across platforms ──────────────────────
function XIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
}
function GithubIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>;
}
function GitlabIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" /></svg>;
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
    refetchInterval: 30_000,
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
    refetchInterval: 30_000,
  });

  const allAccounts = accountsData?.accounts || [];
  const xAccounts = allAccounts.filter((a: Account) => a.platform === "twitter");
  const ghAccounts = allAccounts.filter((a: Account) => a.platform === "github");
  const glAccounts = allAccounts.filter((a: Account) => a.platform === "gitlab");

  const ghOverviews = useQueries({
    queries: ghAccounts.map((acc) => ({
      queryKey: ["github", "overview", acc.id],
      queryFn: () => api.getGithubOverview(acc.id),
      staleTime: 30_000,
    })),
  });

  const glOverviews = useQueries({
    queries: glAccounts.map((acc) => ({
      queryKey: ["gitlab", "overview", acc.id],
      queryFn: () => api.getGitlabOverview(acc.id),
      staleTime: 30_000,
    })),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  // ── aggregate GH stats across all accounts ──────────────────
  const ghAllRepos = ghOverviews.flatMap((o) => o.data?.allRepos ?? []);
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
              <Badge key={acc.id} className="text-[10px] px-1.5 py-0.5">
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
            <StatCard title={t("overview.stats.totalTweets")} value={stats?.total_tweets ?? 0} icon={<MessageSquare size={16} />} description={stats ? t("overview.stats.today", { count: stats.todayTweets }) : undefined} />
            <StatCard title={t("overview.stats.totalRetweets")} value={stats?.total_retweets ?? 0} icon={<Repeat2 size={16} />} description={stats ? t("overview.stats.today", { count: stats.todayRetweets }) : undefined} />
            <StatCard title={t("overview.stats.avgEngagement")} value={stats?.avgEngagement ?? "0"} icon={<TrendingUp size={16} />} description={t("overview.stats.perTweet")} />
            <StatCard title={t("overview.stats.totalViews")} value={stats?.total_views ?? 0} icon={<Eye size={16} />} />
            <StatCard title={t("overview.stats.followers")} value={stats?.followersCount ?? 0} icon={<TrendingUp size={16} />} description={stats ? t("overview.stats.following", { count: stats.followingCount }) : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.tweetActivity")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={timeline.dailyTweets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Bar dataKey="tweets_count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noTweetData")}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.dailyEngagement")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noEngagementData")}</div>
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

      {allAccounts.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] italic">{t("overview.noAccounts")}</p>
      )}
    </div>
  );
}
