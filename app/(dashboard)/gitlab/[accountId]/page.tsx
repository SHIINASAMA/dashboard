"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { api, type GitlabOverview, type GitlabContribution, type GitlabProject } from "@/lib/api";
import { formatDateTime } from "@/lib/client/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Portal } from "@/components/ui/Portal";
import { StatCard } from "@/components/StatCard";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, ArrowUpRight, Play, RefreshCw, Trash2, AlertCircle, Star, GitFork, Code, Users, BookOpen, Settings2 } from "lucide-react";
import { useIsMobile } from "@/lib/client/useIsMobile";
import { GitlabIcon } from "@/components/BrandIcons";
import { StatCardSkeleton, ChartCardSkeleton, Skeleton } from "@/components/Skeleton";

function ContributionHeatmap({ data, tNamespace }: { data: GitlabContribution[]; tNamespace: string }) {
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
    if (intensity < 0.25) return "bg-[var(--chart-4)]/40";
    if (intensity < 0.5) return "bg-[var(--chart-4)]/60";
    if (intensity < 0.75) return "bg-[var(--chart-4)]/80";
    return "bg-[var(--chart-4)]";
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5" style={{ minWidth: 700 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div key={day.date} className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={t(`${tNamespace}.contributions`, { date: day.date, count: day.count })} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end text-xs text-[var(--muted-foreground)]">
        <span>{t(`${tNamespace}.less`)}</span>
        <div className="w-3 h-3 rounded-sm bg-[var(--muted)]" />
        <div className="w-3 h-3 rounded-sm bg-[var(--chart-4)]/25" />
        <div className="w-3 h-3 rounded-sm bg-[var(--chart-4)]/50" />
        <div className="w-3 h-3 rounded-sm bg-[var(--chart-4)]/75" />
        <div className="w-3 h-3 rounded-sm bg-[var(--chart-4)]" />
        <span>{t(`${tNamespace}.more`)}</span>
      </div>
    </div>
  );
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-3)", "var(--chart-4)", "var(--chart-1)"];

export default function GitLabDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountId = Number(id);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());

  const openPinDialog = () => {
    if (overview?.allProjects) {
      setPinnedIds(new Set(overview.allProjects.filter(r => r.pinned).map(r => r.project_id)));
    }
    setShowPinDialog(true);
  };

  const handlePinSave = async () => {
    await api.setPinnedGitlabProjects(accountId, [...pinnedIds]);
    queryClient.invalidateQueries({ queryKey: ["gitlab", "overview", accountId] });
    setShowPinDialog(false);
  };

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<GitlabOverview>({
    queryKey: ["gitlab", "overview", accountId],
    queryFn: () => api.getGitlabOverview(accountId!),
    enabled: !!accountId,
    refetchInterval: 3 * 60_000,
  });

  const { data: contributions } = useQuery<GitlabContribution[]>({
    queryKey: ["gitlab", "contributions", accountId],
    queryFn: () => api.getGitlabContributions(accountId!),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => router.push("/gitlab"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const isMobile = useIsMobile();
  const PIE_H = isMobile ? 200 : 300;

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <div className="detail-header">
          <div className="detail-header-body">
            <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
            <div className="flex-1"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-3 w-48" /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ChartCardSkeleton />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("gitlabDetail.notFound")}</p>
        <button onClick={() => router.push("/gitlab")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("gitlabDetail.backToGitLab")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="detail-header">
        <div className="detail-header-body">
        <button onClick={() => router.push("/gitlab")} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors shrink-0 mt-0.5" title={t("gitlabDetail.backToGitLab")} aria-label={t("gitlabDetail.backToGitLab")}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <GitlabIcon size={18} className="shrink-0 mt-1" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{account.screen_name}</h2>
              {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("gitlabDetail.fetchInterval", { minutes: account.fetch_interval })}
              {account.last_fetched_at && ` • ${t("gitlabDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
            </p>
          </div>
        </div>
        </div>
        <div className="detail-header-actions">
          <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs disabled:opacity-40">
            <Play size={12} /> {triggerMutation.isPending ? t("gitlabDetail.fetching") : t("gitlabDetail.fetchNow")}
          </button>
          <button onClick={() => { api.updateAccount(accountId, { isActive: !account.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["account", accountId] })); }}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors" title={account.is_active ? t("gitlabDetail.disable") : t("gitlabDetail.enable")} aria-label={account.is_active ? t("gitlabDetail.disable") : t("gitlabDetail.enable")}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowDeleteDialog(true)}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--danger)]/10 transition-colors text-[var(--danger)]" title={t("gitlabDetail.delete")} aria-label={t("gitlabDetail.delete")}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/5 text-[var(--danger)] text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {overviewLoading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">{t("gitlabDetail.loadingGitLabData")}</div>
      ) : overview && overview.stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t("gitlabDetail.projects")} value={overview.totalProjects} icon={<BookOpen size={20} />} />
            <StatCard title={t("gitlabDetail.totalStars")} value={overview.totalStars} icon={<Star size={20} />} />
            <StatCard title={t("gitlabDetail.totalForks")} value={overview.totalForks} icon={<GitFork size={20} />} />
            <StatCard title={t("gitlabDetail.followers")} value={overview.stats.followers} icon={<Users size={20} />} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><BookOpen size={18} /> {t("gitlabDetail.projectsHeading")}</CardTitle>
                <button
                  onClick={openPinDialog}
                  className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs font-medium"
                >
                  <Settings2 size={14} /> {t("gitlabDetail.managePins")}
                </button>
              </div>
              <CardDescription>
                {overview.allProjects && overview.allProjects.some(r => r.pinned)
                  ? t("gitlabDetail.projectsDescPinned")
                  : t("gitlabDetail.projectsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.projects.length > 0 ? (
                <div className="space-y-2">
                  {overview.projects.map((p: GitlabProject) => (
                    <div key={p.id}
                      onClick={() => router.push(`/gitlab/${accountId}/projects/${p.project_id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] cursor-pointer transition-colors"
                    >
                      <BookOpen size={16} className="text-[var(--muted-foreground)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{p.path_with_namespace}</span>
                          {p.language && <Badge className="shrink-0">{p.language}</Badge>}
                          {p.visibility !== "public" && <Badge className="shrink-0 text-[10px]">{p.visibility}</Badge>}
                        </div>
                        {p.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{p.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span className="flex items-center gap-1"><Star size={12} /> {p.stars}</span>
                          <span className="flex items-center gap-1"><GitFork size={12} /> {p.forks}</span>
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-[var(--muted-foreground)]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-sm text-[var(--muted-foreground)]">
                  <BookOpen size={32} className="opacity-30" />
                  <p>{t("gitlabDetail.noPinnedProjects")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {showPinDialog && (
            <Portal>
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPinDialog(false)}>
                <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg border border-[var(--border)] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{t("gitlabDetail.managePins")}</h2>
                    <button onClick={() => setShowPinDialog(false)} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{t("common.cancel")}</button>
                  </div>
                  <div className="space-y-1 overflow-y-auto flex-1">
                    {overview.allProjects?.map((p: GitlabProject) => (
                      <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={pinnedIds.has(p.project_id)}
                          onChange={(e) => {
                            setPinnedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(p.project_id);
                              else next.delete(p.project_id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded accent-[var(--primary)] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm">{p.path_with_namespace}</span>
                          {p.language && <span className="text-xs text-[var(--muted-foreground)] ml-2">{p.language}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                          <span className="flex items-center gap-1"><Star size={12} /> {p.stars}</span>
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
            </Portal>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitlabIcon size={18} /> {t("gitlabDetail.contributionCalendar")}</CardTitle>
              <CardDescription>{t("gitlabDetail.contributionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {contributions && contributions.length > 0 ? (
                <ContributionHeatmap data={contributions} tNamespace="gitlabDetail" />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t("gitlabDetail.noContributionData")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code size={18} /> {t("gitlabDetail.languages")}</CardTitle>
              <CardDescription>{t("gitlabDetail.languagesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(overview.languages).length > 0 ? (
                <div role="img" aria-label={t("gitlabDetail.languages")}>
                <ResponsiveContainer width="100%" height={PIE_H}>
                  <PieChart>
                    <Pie data={Object.entries(overview.languages).map(([name, count]) => ({ name, count }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {Object.keys(overview.languages).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t("gitlabDetail.noLanguageData")}</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t("gitlabDetail.noData")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">{t("gitlabDetail.noDataDesc")}</p>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("gitlabDetail.delete")}
        description={t("gitlabDetail.deleteConfirm", { name: account.screen_name })}
        onConfirm={async () => deleteMutation.mutate()}
      />
    </div>
  );
}
