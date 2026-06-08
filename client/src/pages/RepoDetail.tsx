import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api, type GithubRepo } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { ArrowLeft, Star, GitFork, Download, ExternalLink, Globe, TrendingUp, Eye, Activity, FileText } from "lucide-react";

export function RepoDetail() {
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

  const { data: paths } = useQuery({
    queryKey: ["github", "paths", aid, rid],
    queryFn: () => api.getGithubPaths(aid, rid),
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
        <p className="text-[var(--muted-foreground)]">Repository not found</p>
        <button onClick={() => navigate(`/github/${aid}`)} className="mt-4 text-sm text-[var(--primary)] hover:underline">Back to account</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/github/${aid}`)} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold truncate">{repo.full_name}</h2>
            {repo.language && <Badge>{repo.language}</Badge>}
            {repo.is_fork ? 1 : 0 ? <Badge>Fork</Badge> : null}
          </div>
          {repo.description && <p className="text-sm text-[var(--muted-foreground)]">{repo.description}</p>}
        </div>
        <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
          <ExternalLink size={14} /> Open
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Star size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.stars.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">Stars</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><GitFork size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.forks.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">Forks</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Activity size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.open_issues.toLocaleString()}</p><p className="text-xs text-[var(--muted-foreground)]">Open Issues</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Globe size={16} className="inline mb-1 text-[var(--muted-foreground)]" /><p className="text-2xl font-bold">{repo.homepage ? "Yes" : "—"}</p><p className="text-xs text-[var(--muted-foreground)]">Homepage</p></CardContent></Card>
      </div>

      {/* Star history chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> Star History</CardTitle>
          <CardDescription>Star count over time (recorded per fetch)</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                <Area type="monotone" dataKey="stars" stroke="#f59e0b" fill="#f59e0b20" name="Stars" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted-foreground)]">
              {snapshots?.length === 1 ? "Only one data point. Run more fetches to build a star history." : "No star history yet. Data is recorded with each fetch."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download size={18} /> Git Clones</CardTitle>
            <CardDescription>Daily clone counts (data accumulates with each fetch)</CardDescription>
          </CardHeader>
          <CardContent>
            {clones && clones.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clones}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Clones" />
                  <Bar dataKey="uniques" fill="#6366f1" radius={[4, 4, 0, 0]} name="Unique cloners" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[var(--muted-foreground)]">
                No clone data. Requires a classic PAT with repo scope (fine-grained tokens don't support traffic API).
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye size={18} /> Visitors</CardTitle>
            <CardDescription>Daily page view counts (data accumulates with each fetch)</CardDescription>
          </CardHeader>
          <CardContent>
            {views && views.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={views}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Views" />
                  <Bar dataKey="uniques" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Unique visitors" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-[var(--muted-foreground)]">
                No traffic data. Requires a classic PAT with repo scope (fine-grained tokens don't support traffic API).
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrers & Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe size={18} /> Referring Sites</CardTitle>
            <CardDescription>Top sources of traffic</CardDescription>
          </CardHeader>
          <CardContent>
            {referrers && referrers.length > 0 ? (
              <div className="space-y-2">
                {referrers.slice(0, 10).map((r) => (
                  <div key={r.referrer} className="flex items-center justify-between p-2 rounded-lg bg-[var(--muted)]">
                    <span className="text-sm font-mono">{r.referrer}</span>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span>{r.count} views</span>
                      <span>{r.uniques} unique</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No referrer data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText size={18} /> Popular Content</CardTitle>
            <CardDescription>Most viewed paths</CardDescription>
          </CardHeader>
          <CardContent>
            {paths && paths.length > 0 ? (
              <div className="space-y-2">
                {paths.slice(0, 10).map((p) => (
                  <div key={p.path} className="p-2 rounded-lg bg-[var(--muted)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono truncate">{p.path}</span>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] shrink-0 ml-2">
                        <span>{p.count} views</span>
                        <span>{p.uniques} unique</span>
                      </div>
                    </div>
                    {p.title && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{p.title}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No popular content data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Releases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download size={18} /> Releases & Downloads</CardTitle>
          <CardDescription>Download counts per release</CardDescription>
        </CardHeader>
        <CardContent>
          {releases && releases.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, releases.length * 60)}>
              <BarChart data={releases} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="tag_name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={120} tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + "…" : v} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}
                  formatter={((value: number) => [value.toLocaleString(), "Downloads"]) as any}
                  labelFormatter={((label: string) => {
                    const rel = releases.find((r: any) => r.tag_name === label);
                    return rel ? `${rel.name || rel.tag_name} — ${new Date(rel.published_at).toLocaleDateString()}` : label;
                  }) as any}
                />
                <Bar dataKey="total_downloads" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No releases found. Requires a classic PAT with repo scope.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
