import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type GithubOverview, type GithubContribution, type GithubRepo } from "../api";
import { formatDateTime } from "../lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/StatCard";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, ArrowUpRight, Play, RefreshCw, Trash2, AlertCircle, Star, GitFork, Code, Users, BookOpen, Settings2 } from "lucide-react";
import { GithubIcon } from "../components/BrandIcons";

function GithubHeatmap({ data }: { data: GithubContribution[] }) {
  const { t } = useTranslation();
  const dayMap = new Map(data.map((d) => [d.date, d.count]));
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
  let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const day = { date: key, count: dayMap.get(key) || 0, dayOfWeek: d.getDay() };
    currentWeek.push(day);
    if (day.dayOfWeek === 6) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxCount = Math.max(...Array.from(dayMap.values()), 1);

  const getColor = (count: number) => {
    if (count === 0) return "bg-[var(--muted)]";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "bg-green-200 dark:bg-green-900";
    if (intensity < 0.5) return "bg-green-400 dark:bg-green-700";
    if (intensity < 0.75) return "bg-green-500 dark:bg-green-500";
    return "bg-green-700 dark:bg-green-400";
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5" style={{ minWidth: 700 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div key={day.date} className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={t("githubDetail.contributions", { date: day.date, count: day.count })} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end text-xs text-[var(--muted-foreground)]">
        <span>{t("githubDetail.less")}</span>
        <div className="w-3 h-3 rounded-sm bg-[var(--muted)]" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-400" />
        <span>{t("githubDetail.more")}</span>
      </div>
    </div>
  );
}

const COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1"];

export function GitHubDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountId = Number(id);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());

  const openPinDialog = () => {
    if (overview?.allRepos) {
      setPinnedIds(new Set(overview.allRepos.filter(r => r.pinned).map(r => r.repo_id)));
    }
    setShowPinDialog(true);
  };

  const handlePinSave = async () => {
    await api.setPinnedRepos(accountId, [...pinnedIds]);
    queryClient.invalidateQueries({ queryKey: ["github", "overview", accountId] });
    setShowPinDialog(false);
  };

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<GithubOverview>({
    queryKey: ["github", "overview", accountId],
    queryFn: () => api.getGithubOverview(accountId!),
    enabled: !!accountId,
    refetchInterval: 3 * 60_000,
  });

  const { data: contributions } = useQuery<GithubContribution[]>({
    queryKey: ["github", "contributions", accountId],
    queryFn: () => api.getGithubContributions(accountId!),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => navigate("/github"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (accountLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("githubDetail.notFound")}</p>
        <button onClick={() => navigate("/github")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("githubDetail.backToGitHub")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/github")} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" title={t("githubDetail.backToGitHub")} aria-label={t("githubDetail.backToGitHub")}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <GithubIcon size={18} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{account.screen_name}</h2>
              {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("githubDetail.fetchInterval", { minutes: account.fetch_interval })}
              {account.last_fetched_at && ` • ${t("githubDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm disabled:opacity-40">
            <Play size={14} /> {triggerMutation.isPending ? t("githubDetail.fetching") : t("githubDetail.fetchNow")}
          </button>
          <button onClick={() => { api.updateAccount(accountId, { isActive: !account.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["account", accountId] })); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors" title={account.is_active ? t("githubDetail.disable") : t("githubDetail.enable")} aria-label={account.is_active ? t("githubDetail.disable") : t("githubDetail.enable")}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { if (confirm(t("githubDetail.deleteConfirm", { name: account.screen_name }))) deleteMutation.mutate(); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500" title={t("githubDetail.delete")} aria-label={t("githubDetail.delete")}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {overviewLoading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">{t("githubDetail.loadingGitHubData")}</div>
      ) : overview && overview.stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t("githubDetail.repositories")} value={overview.totalRepos} icon={<BookOpen size={20} />} />
            <StatCard title={t("githubDetail.totalStars")} value={overview.totalStars} icon={<Star size={20} />} />
            <StatCard title={t("githubDetail.totalForks")} value={overview.totalForks} icon={<GitFork size={20} />} />
            <StatCard title={t("githubDetail.followers")} value={overview.stats.followers} icon={<Users size={20} />} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><BookOpen size={18} /> {t("githubDetail.reposHeading")}</CardTitle>
                <button
                  onClick={openPinDialog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs font-medium"
                >
                  <Settings2 size={14} /> {t("githubDetail.managePins")}
                </button>
              </div>
              <CardDescription>
                {overview.allRepos && overview.allRepos.some(r => r.pinned)
                  ? t("githubDetail.reposDescPinned")
                  : t("githubDetail.reposDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.repos.length > 0 ? (
                <div className="space-y-2">
                  {overview.repos.map((repo: GithubRepo) => (
                    <div key={repo.id}
                      onClick={() => navigate(`/github/${accountId}/repos/${repo.repo_id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] cursor-pointer transition-colors"
                    >
                      <BookOpen size={16} className="text-[var(--muted-foreground)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{repo.full_name}</span>
                          {repo.language && <Badge className="shrink-0">{repo.language}</Badge>}
                        </div>
                        {repo.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{repo.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span className="flex items-center gap-1"><Star size={12} /> {repo.stars}</span>
                          <span className="flex items-center gap-1"><GitFork size={12} /> {repo.forks}</span>
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-[var(--muted-foreground)]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-sm text-[var(--muted-foreground)]">
                  <BookOpen size={32} className="opacity-30" />
                  <p>{t("githubDetail.noPinnedRepos")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {showPinDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPinDialog(false)}>
              <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg border border-[var(--border)] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{t("githubDetail.managePins")}</h2>
                  <button onClick={() => setShowPinDialog(false)} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{t("common.cancel")}</button>
                </div>
                <div className="space-y-1 overflow-y-auto flex-1">
                  {overview.allRepos?.map((repo: GithubRepo) => (
                    <label key={repo.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={pinnedIds.has(repo.repo_id)}
                        onChange={(e) => {
                          setPinnedIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(repo.repo_id);
                            else next.delete(repo.repo_id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded accent-[var(--primary)] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm">{repo.full_name}</span>
                        {repo.language && <span className="text-xs text-[var(--muted-foreground)] ml-2">{repo.language}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1"><Star size={12} /> {repo.stars}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handlePinSave}
                  className="mt-4 w-full px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GithubIcon size={18} /> {t("githubDetail.readmeStats")}</CardTitle>
              <CardDescription>{t("githubDetail.readmeStatsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-6">
                <img
                  src={`https://github-readme-stats-fast.vercel.app/api?username=${account.screen_name}&show_icons=true&hide_border=true&bg_color=00000000&text_color=666&title_color=3b82f6&icon_color=3b82f6`}
                  alt={t("githubDetail.statsImgAlt")}
                  className="max-w-full h-auto"
                  loading="lazy"
                />
                <img
                  src={`https://github-readme-stats-fast.vercel.app/api/top-langs?username=${account.screen_name}&layout=compact&hide_border=true&bg_color=00000000&text_color=666&title_color=3b82f6`}
                  alt={t("githubDetail.languagesImgAlt")}
                  className="max-w-full h-auto"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GithubIcon size={18} /> {t("githubDetail.contributionCalendar")}</CardTitle>
              <CardDescription>{t("githubDetail.contributionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {contributions && contributions.length > 0 ? <GithubHeatmap data={contributions} />
                : <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t("githubDetail.noContributionData")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code size={18} /> {t("githubDetail.languages")}</CardTitle>
              <CardDescription>{t("githubDetail.languagesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(overview.languages).length > 0 ? (
                <div role="img" aria-label={t("githubDetail.languages")}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={Object.entries(overview.languages).map(([name, count]) => ({ name, count }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {Object.keys(overview.languages).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t("githubDetail.noLanguageData")}</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t("githubDetail.noData")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">{t("githubDetail.noDataDesc")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
