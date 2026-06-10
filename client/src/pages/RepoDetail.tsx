import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type GithubRepo } from "../api";
import { formatDate } from "../lib/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, LineChart, Line,
} from "recharts";
import { ArrowLeft, Star, GitFork, Download, ExternalLink, Globe, TrendingUp, Eye, Activity, FileText } from "lucide-react";

const COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6"];

type HistoryPoint = Record<string, string | number>;

export function RepoDetail() {
  const { t } = useTranslation();
  const { accountId, repoId } = useParams<{ accountId: string; repoId: string }>();
  const navigate = useNavigate();
  const aid = Number(accountId);
  const rid = Number(repoId);

  const { data: overview } = useQuery({
    queryKey: ["github", "overview", aid],
    queryFn: () => api.getGithubOverview(aid),
    enabled: !!aid,
  });

  const repo: GithubRepo | undefined = overview?.repos.find((r) => r.repo_id === rid);

  const { data: snapshots } = useQuery({
    queryKey: ["github", "snapshots", aid, rid],
    queryFn: () => api.getGithubRepoSnapshots(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: clones } = useQuery({
    queryKey: ["github", "clones", aid, rid],
    queryFn: () => api.getGithubTrafficClones(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: views } = useQuery({
    queryKey: ["github", "views", aid, rid],
    queryFn: () => api.getGithubTrafficViews(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: referrers } = useQuery({
    queryKey: ["github", "referrers", aid, rid],
    queryFn: () => api.getGithubReferrers(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: referrerHistory } = useQuery({
    queryKey: ["github", "referrers", "history", aid, rid],
    queryFn: () => api.getGithubReferrerHistory(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: paths } = useQuery({
    queryKey: ["github", "paths", aid, rid],
    queryFn: () => api.getGithubPaths(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: pathHistory } = useQuery({
    queryKey: ["github", "paths", "history", aid, rid],
    queryFn: () => api.getGithubPathHistory(aid, rid),
    enabled: !!aid && !!rid,
  });

  const { data: releases } = useQuery({
    queryKey: ["github", "releases", aid, rid],
    queryFn: () => api.getGithubReleases(aid, rid),
    enabled: !!aid && !!rid,
  });

  if (!repo) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("repoDetail.notFound")}</p>
        <button onClick={() => navigate(`/github/${aid}`)} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("repoDetail.backToAccount")}</button>
      </div>
    );
  }

  let referrerHistoryChart: HistoryPoint[] | null = null;
  const referrerHistoryData = referrerHistory;
  const referrersData = referrers;
  if (referrerHistoryData && referrerHistoryData.length > 0 && referrersData?.length) {
    const refs = referrersData.slice(0, 5).map(r => r.referrer);
    if (refs.length > 0) {
      const dates = [...new Set(referrerHistoryData.map((r) => r.snapshot_date))].sort() as string[];
      referrerHistoryChart = dates.map((date: string) => {
        const point: HistoryPoint = { date };
        for (const ref of refs) {
          const entry = referrerHistoryData.find((r) => r.referrer === ref && r.snapshot_date === date);
          point[ref] = entry?.count || 0;
        }
        return point;
      });
    }
  }

  let pathHistoryChart: HistoryPoint[] | null = null;
  const pathHistoryData = pathHistory;
  const pathsData = paths;
  if (pathHistoryData && pathHistoryData.length > 0 && pathsData?.length) {
    const pts = pathsData.slice(0, 5).map(p => p.path);
    if (pts.length > 0) {
      const dates = [...new Set(pathHistoryData.map((p) => p.snapshot_date))].sort() as string[];
      pathHistoryChart = dates.map((date: string) => {
        const point: HistoryPoint = { date };
        for (const pp of pts) {
          const entry = pathHistoryData.find((h) => h.path === pp && h.snapshot_date === date);
          point[pp] = entry?.count || 0;
        }
        return point;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/github/${aid}`)} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" title={t("repoDetail.backToAccount")} aria-label={t("repoDetail.backToAccount")}>
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{repo.full_name}</h2>
            {repo.language && <Badge>{repo.language}</Badge>}
            {repo.is_fork ? <Badge>{t("badge.fork")}</Badge> : null}
          </div>
          {repo.description && <p className="text-sm text-[var(--muted-foreground)]">{repo.description}</p>}
        </div>
        <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
          <ExternalLink size={14} /> {t("repoDetail.open")}
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><Star size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.stars.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("repoDetail.stars")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><GitFork size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.forks.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("repoDetail.forks")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Activity size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.open_issues.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("repoDetail.openIssues")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> {t("repoDetail.starHistory")}</CardTitle>
          <CardDescription>{t("repoDetail.starHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 1 ? (
            <div role="img" aria-label={t("repoDetail.starHistory")}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                <Area type="monotone" dataKey="stars" stroke="#f59e0b" fill="#f59e0b20" name={t("repoDetail.stars")} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted-foreground)]">
              {snapshots?.length === 1 ? t("repoDetail.onlyOneDataPoint") : t("repoDetail.noStarHistory")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download size={18} /> {t("repoDetail.gitClones")}</CardTitle>
            <CardDescription>{t("repoDetail.gitClonesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {clones && clones.length > 0 ? (
              <div role="img" aria-label={t("repoDetail.gitClones")}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clones}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t("repoDetail.clones")} />
                  <Bar dataKey="uniques" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("repoDetail.uniqueCloners")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[var(--muted-foreground)]">
                {t("repoDetail.noCloneData")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye size={18} /> {t("repoDetail.visitors")}</CardTitle>
            <CardDescription>{t("repoDetail.visitorsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {views && views.length > 0 ? (
              <div role="img" aria-label={t("repoDetail.visitors")}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={views}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name={t("repoDetail.views")} />
                  <Bar dataKey="uniques" fill="#14b8a6" radius={[4, 4, 0, 0]} name={t("repoDetail.uniqueVisitors")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[var(--muted-foreground)]">
                {t("repoDetail.noTrafficData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe size={18} /> {t("repoDetail.referringSites")}</CardTitle>
            <CardDescription>{t("repoDetail.referringSitesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {referrerHistoryChart && referrerHistoryChart.length > 1 ? (
              <div role="img" aria-label={t("repoDetail.referringSites")}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={referrerHistoryChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="left" wrapperStyle={{ fontSize: "12px" }} />
                  {(referrers?.slice(0, 5) || []).map((ref, i) => (
                    <Line key={ref.referrer} type="monotone" dataKey={ref.referrer} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t("repoDetail.noReferrerData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText size={18} /> {t("repoDetail.popularContent")}</CardTitle>
            <CardDescription>{t("repoDetail.popularContentDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {pathHistoryChart && pathHistoryChart.length > 1 ? (
              <div role="img" aria-label={t("repoDetail.popularContent")}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pathHistoryChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="left" wrapperStyle={{ fontSize: "12px" }} />
                  {(paths?.slice(0, 5) || []).map((p, i) => (
                    <Line key={p.path} type="monotone" dataKey={p.path} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t("repoDetail.noPopularContent")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download size={18} /> {t("repoDetail.releasesDownloads")}</CardTitle>
          <CardDescription>{t("repoDetail.releasesDownloadsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {releases && releases.length > 0 ? (
            <div role="img" aria-label={t("repoDetail.releasesDownloads")}>
            <ResponsiveContainer width="100%" height={Math.max(200, releases.length * 60)}>
              <BarChart data={releases} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="tag_name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={120} tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + "…" : v} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                  formatter={(value) => [String(value).toLocaleString() ?? "", t("repoDetail.downloads")]}
                  labelFormatter={(label) => {
                    const rel = releases.find((r) => r.tag_name === label);
                    return rel ? `${rel.name || rel.tag_name} — ${rel.published_at ? formatDate(rel.published_at) : ""}` : label;
                  }}
                />
                <Bar dataKey="total_downloads" fill="#8b5cf6" radius={[0, 4, 4, 0]} name={t("repoDetail.downloads")} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              {t("repoDetail.noReleases")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
