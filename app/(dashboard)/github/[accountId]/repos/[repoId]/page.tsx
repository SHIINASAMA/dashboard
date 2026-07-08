"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { api, type GithubRepo, type GithubRelease } from "@/lib/api";
import { formatDate } from "@/lib/client/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import { ArrowLeft, Star, GitFork, Download, ExternalLink, Globe, TrendingUp, Eye, Activity, FileText } from "lucide-react";
import { useIsMobile } from "@/lib/client/useIsMobile";
import { calcYAxisWidth } from "@/lib/client/utils";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#6366f1"];

type HistoryPoint = Record<string, string | number>;

function MultiSelectDropdown({ items, selected, onToggle, onSelectAll, onShowLatest, onDeselectAll, label, latestLabel, isMobile }: {
  items: Array<{ id: string; label: string }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onShowLatest: () => void;
  onDeselectAll: () => void;
  label: string;
  latestLabel: string;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItems = items.filter((item) => selected.has(item.id));

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[var(--muted-foreground)] font-medium">{label}</span>
        <button onClick={onSelectAll} className="text-xs text-[var(--primary)] hover:underline">{t("repoDetail.selectAll")}</button>
        <button onClick={onShowLatest} className="text-xs text-[var(--primary)] hover:underline">{latestLabel}</button>
        <button onClick={onDeselectAll} className="text-xs text-[var(--primary)] hover:underline">{t("repoDetail.hideAll")}</button>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedItems.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--secondary)] rounded-md text-xs text-[var(--secondary-foreground)]">
              {item.label.length > (isMobile ? 8 : 15) ? item.label.slice(0, isMobile ? 8 : 15) + "..." : item.label}
              <button onClick={() => onToggle(item.id)} className="ml-0.5 hover:text-[var(--foreground)] text-sm leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[var(--border)] rounded-md text-sm text-left hover:bg-[var(--accent)] transition-colors"
      >
        <span className="text-[var(--muted-foreground)]">
          {selected.size === items.length ? t("repoDetail.allSelected") : t("repoDetail.nSelected", { count: selected.size })}
        </span>
        <span className="text-[var(--muted-foreground)] text-xs">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("repoDetail.searchVersions")}
              className="w-full px-3 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t("repoDetail.noResults")}</p>
            ) : (
              filtered.map((item) => (
                <label key={item.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--accent)] text-sm select-none">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="accent-[var(--chart-1)] w-4 h-4"
                  />
                  <span className="text-[var(--foreground)] truncate">{item.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReleaseDownloadsChart({ releases, isMobile }: { releases: GithubRelease[]; isMobile: boolean }) {
  const { t } = useTranslation();

  const assetNames = new Map<string, number>();
  for (const rel of releases) {
    for (const a of rel.assets) {
      assetNames.set(a.name, (assetNames.get(a.name) || 0) + a.download_count);
    }
  }

  const topAssets = [...assetNames.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  const DEFAULT_VISIBLE = 10;
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [hiddenReleases, setHiddenReleases] = useState<Set<number>>(() => {
    if (releases.length <= DEFAULT_VISIBLE) return new Set();
    return new Set(releases.slice(DEFAULT_VISIBLE).map((r) => r.id));
  });

  const visibleAssets = topAssets.filter((name) => !hiddenAssets.has(name));
  const visibleReleases = releases.filter((r) => !hiddenReleases.has(r.id));

  const chartData = visibleReleases.map((rel) => {
    const row: Record<string, string | number> = { tag_name: rel.tag_name || "" };
    for (const name of visibleAssets) {
      const asset = rel.assets.find((a) => a.name === name);
      row[name] = asset?.download_count || 0;
    }
    return row;
  });

  const chartHeight = Math.max(isMobile ? 140 : 200, visibleReleases.length * (isMobile ? 36 : 50));

  const toggleAsset = (name: string) => {
    setHiddenAssets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleRelease = (id: number) => {
    setHiddenReleases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const versionItems = releases.map((r) => ({ id: String(r.id), label: r.tag_name || `#${r.release_id}` }));
  const selectedVersions = new Set(releases.filter((r) => !hiddenReleases.has(r.id)).map((r) => String(r.id)));

  return (
    <div role="img" aria-label={t("repoDetail.releasesDownloads")}>
      {releases.length > 1 && (
        <div className="mb-3">
          <MultiSelectDropdown
            items={versionItems}
            selected={selectedVersions}
            onToggle={(id) => toggleRelease(Number(id))}
            onSelectAll={() => setHiddenReleases(new Set())}
            onShowLatest={() => setHiddenReleases(new Set(releases.slice(DEFAULT_VISIBLE).map((r) => r.id)))}
            onDeselectAll={() => setHiddenReleases(new Set(releases.map((r) => r.id)))}
            label={t("repoDetail.versions")}
            latestLabel={t("repoDetail.latestN", { n: DEFAULT_VISIBLE })}
            isMobile={isMobile}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        <span className="text-xs text-[var(--muted-foreground)] font-medium">{t("repoDetail.assets")}</span>
        <button onClick={() => setHiddenAssets(new Set())} className="text-xs text-[var(--primary)] hover:underline">{t("repoDetail.selectAll")}</button>
        <button onClick={() => setHiddenAssets(new Set(topAssets))} className="text-xs text-[var(--primary)] hover:underline">{t("repoDetail.hideAll")}</button>
        {topAssets.map((name, i) => (
          <label key={name} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={!hiddenAssets.has(name)}
              onChange={() => toggleAsset(name)}
              className="accent-[var(--chart-1)] w-4 h-4"
            />
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[var(--muted-foreground)] truncate max-w-[120px]" title={name}>
              {name.length > (isMobile ? 10 : 20) ? name.slice(0, isMobile ? 10 : 20) + "..." : name}
            </span>
          </label>
        ))}
      </div>

      {visibleAssets.length === 0 || visibleReleases.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] text-center py-4">{t("repoDetail.noAssetsSelected")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis type="category" dataKey="tag_name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={isMobile ? 50 : 120} tickFormatter={(v: string) => v.length > (isMobile ? 6 : 15) ? v.slice(0, isMobile ? 6 : 15) + "..." : v} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }}
              formatter={(value, name) => [String(value), String(name)]}
              labelFormatter={(label) => {
                const rel = releases.find((r) => r.tag_name === label);
                return rel ? `${rel.name || rel.tag_name} — ${rel.published_at ? formatDate(rel.published_at) : ""}` : label;
              }}
            />
            {visibleAssets.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="assets"
                fill={COLORS[topAssets.indexOf(name) % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function RepoDetail() {
  const { t } = useTranslation();
  const { accountId, repoId } = useParams<{ accountId: string; repoId: string }>();
  const router = useRouter();
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

  const isMobile = useIsMobile();
  const CHART_H = isMobile ? 180 : 250;
  const TALL_CHART_H = isMobile ? 200 : 300;
  const MARGIN = { top: 5, right: 5, left: 0, bottom: 5 };

  if (!repo) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("repoDetail.notFound")}</p>
        <button onClick={() => router.push(`/github/${aid}`)} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("repoDetail.backToAccount")}</button>
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
      <div className="detail-header">
        <div className="detail-header-body">
        <button onClick={() => router.push(`/github/${aid}`)} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors shrink-0 mt-0.5" title={t("repoDetail.backToAccount")} aria-label={t("repoDetail.backToAccount")}>
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{repo.full_name}</h2>
            {repo.language && <Badge>{repo.language}</Badge>}
            {repo.is_fork ? <Badge>{t("badge.fork")}</Badge> : null}
          </div>
          {repo.description && <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{repo.description}</p>}
        </div>
        </div>
        <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer"
          className="detail-header-actions flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs">
          <ExternalLink size={12} /> {t("repoDetail.open")}
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
            <ResponsiveContainer width="100%" height={CHART_H}>
              <AreaChart data={snapshots} margin={MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(snapshots, "stars")} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="stars" stroke="var(--chart-3)" fill="color-mix(in oklch, var(--chart-3) 12%, transparent)" name={t("repoDetail.stars")} />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center text-sm text-[var(--muted-foreground)]" style={{ height: CHART_H }}>
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
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={clones} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(clones, "count", "uniques")} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name={t("repoDetail.clones")} />
                  <Bar dataKey="uniques" fill="var(--chart-3)" radius={[4, 4, 0, 0]} name={t("repoDetail.uniqueCloners")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-[var(--muted-foreground)]" style={{ height: CHART_H }}>
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
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={views} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(views, "count", "uniques")} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name={t("repoDetail.views")} />
                  <Bar dataKey="uniques" fill="var(--chart-5)" radius={[4, 4, 0, 0]} name={t("repoDetail.uniqueVisitors")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-[var(--muted-foreground)]" style={{ height: CHART_H }}>
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
              <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mb-2 ${isMobile ? "text-[10px]" : "text-xs"}`}>
                {(referrers?.slice(0, 5) || []).map((ref, i) => (
                  <span key={ref.referrer} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                    <span className="truncate max-w-[120px] text-[var(--muted-foreground)]">{ref.referrer}</span>
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={TALL_CHART_H}>
                <LineChart data={referrerHistoryChart} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(referrerHistoryChart, ...(referrers?.slice(0, 5).map(r => r.referrer) ?? []))} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
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
              <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mb-2 ${isMobile ? "text-[10px]" : "text-xs"}`}>
                {(paths?.slice(0, 5) || []).map((p, i) => (
                  <span key={p.path} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                    <span className="truncate max-w-[120px] text-[var(--muted-foreground)]">{p.path}</span>
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={TALL_CHART_H}>
                <LineChart data={pathHistoryChart} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(pathHistoryChart, ...(paths?.slice(0, 5).map(p => p.path) ?? []))} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
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
            <ReleaseDownloadsChart releases={releases} isMobile={isMobile} />
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
