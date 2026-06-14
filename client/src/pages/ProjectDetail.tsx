import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type Account } from "../api";
import { formatDate } from "../lib/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { ArrowLeft, Star, GitFork, Download, ExternalLink, TrendingUp, Activity } from "lucide-react";

export function ProjectDetail() {
  const { t } = useTranslation();
  const { accountId, projectId } = useParams<{ accountId: string; projectId: string }>();
  const navigate = useNavigate();
  const aid = Number(accountId);
  const pid = Number(projectId);

  const { data: overview } = useQuery({
    queryKey: ["gitlab", "overview", aid],
    queryFn: () => api.getGitlabOverview(aid),
    enabled: !!aid,
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const project = overview?.projects.find((p) => p.project_id === pid);
  const account = accountsData?.accounts.find((a: Account) => a.id === aid);
  const instanceUrl = account?.instance_url || "https://gitlab.com";

  const { data: snapshots } = useQuery({
    queryKey: ["gitlab", "snapshots", aid, pid],
    queryFn: () => api.getGitlabProjectSnapshots(aid, pid),
    enabled: !!aid && !!pid,
  });

  const { data: releases } = useQuery({
    queryKey: ["gitlab", "releases", aid, pid],
    queryFn: () => api.getGitlabReleases(aid, pid),
    enabled: !!aid && !!pid,
  });

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("projectDetail.notFound")}</p>
        <button onClick={() => navigate(`/gitlab/${aid}`)} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("projectDetail.backToAccount")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/gitlab/${aid}`)} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" title={t("projectDetail.backToAccount")} aria-label={t("projectDetail.backToAccount")}>
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{project.path_with_namespace}</h2>
            {project.language && <Badge>{project.language}</Badge>}
            {project.visibility !== "public" && <Badge>{project.visibility}</Badge>}
            {project.is_fork ? <Badge>{t("badge.fork")}</Badge> : null}
          </div>
          {project.description && <p className="text-sm text-[var(--muted-foreground)]">{project.description}</p>}
        </div>
        <a href={`${instanceUrl}/${project.path_with_namespace}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
          <ExternalLink size={14} /> {t("projectDetail.open")}
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><Star size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{project.stars.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("projectDetail.stars")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><GitFork size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{project.forks.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("projectDetail.forks")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Activity size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{project.open_issues.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">{t("projectDetail.openIssues")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> {t("projectDetail.starHistory")}</CardTitle>
          <CardDescription>{t("projectDetail.starHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 1 ? (
            <div role="img" aria-label={t("projectDetail.starHistory")}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                <Area type="monotone" dataKey="stars" stroke="var(--chart-3)" fill="color-mix(in oklch, var(--chart-3) 12%, transparent)" name={t("projectDetail.stars")} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted-foreground)]">
              {snapshots?.length === 1 ? t("projectDetail.onlyOneDataPoint") : t("projectDetail.noStarHistory")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download size={18} /> {t("projectDetail.releasesDownloads")}</CardTitle>
          <CardDescription>{t("projectDetail.releasesDownloadsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {releases && releases.length > 0 ? (
            <div role="img" aria-label={t("projectDetail.releasesDownloads")}>
            <ResponsiveContainer width="100%" height={Math.max(200, releases.length * 60)}>
              <BarChart data={releases} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="release_tag" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={120} tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + "…" : v} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                  labelFormatter={(label) => {
                    const rel = releases.find((r) => r.release_tag === label);
                    return rel ? `${rel.name || rel.release_tag} — ${rel.released_at ? formatDate(rel.released_at) : ""}` : label;
                  }}
                />
                <Bar dataKey="total_downloads" fill="var(--chart-3)" radius={[0, 4, 4, 0]} name={t("projectDetail.releases")} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              {t("projectDetail.noReleases")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
