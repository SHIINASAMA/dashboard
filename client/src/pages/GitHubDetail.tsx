import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api, type GithubOverview, type GithubContribution, type GithubRepo } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/StatCard";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowLeft, Play, RefreshCw, Trash2, AlertCircle, Star, GitFork, Code, Users, BookOpen } from "lucide-react";

function GithubInline() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GithubHeatmap({ data }: { data: GithubContribution[] }) {
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
                title={`${day.date}: ${day.count} contributions`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end text-xs text-[var(--muted-foreground)]">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-[var(--muted)]" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-400" />
        <span>More</span>
      </div>
    </div>
  );
}

const COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1"];

export function GitHubDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountId = Number(id);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<GithubOverview>({
    queryKey: ["github", "overview", accountId],
    queryFn: () => api.getGithubOverview(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
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
  });

  if (accountLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">Account not found</p>
        <button onClick={() => navigate("/github")} className="mt-4 text-sm text-[var(--primary)] hover:underline">Back to GitHub</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/github")} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <GithubInline />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{account.screen_name}</h2>
              {!account.is_active && <Badge>Inactive</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Fetch interval: every {account.fetch_interval}m
              {account.last_fetched_at && ` • Last fetched: ${new Date(account.last_fetched_at).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm disabled:opacity-40">
            <Play size={14} /> {triggerMutation.isPending ? "Fetching..." : "Fetch Now"}
          </button>
          <button onClick={() => { api.updateAccount(accountId, { isActive: !account.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["account", accountId] })); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors" title={account.is_active ? "Disable" : "Enable"}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { if (confirm(`Delete ${account.screen_name} and all its data?`)) deleteMutation.mutate(); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500" title="Delete">
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
        <div className="text-center py-12 text-[var(--muted-foreground)]">Loading GitHub data...</div>
      ) : overview && overview.stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Repositories" value={overview.totalRepos} icon={<BookOpen size={20} />} />
            <StatCard title="Total Stars" value={overview.totalStars} icon={<Star size={20} />} />
            <StatCard title="Total Forks" value={overview.totalForks} icon={<GitFork size={20} />} />
            <StatCard title="Followers" value={overview.stats.followers} icon={<Users size={20} />} />
          </div>

          {/* github-readme-stats card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GithubInline /> GitHub Readme Stats</CardTitle>
              <CardDescription>Auto-generated stats card from github-readme-stats-fast</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-6">
                <img
                  src={`https://github-readme-stats-fast.vercel.app/api?username=${account.screen_name}&show_icons=true&hide_border=true&bg_color=00000000&text_color=666&title_color=3b82f6&icon_color=3b82f6`}
                  alt="GitHub Stats"
                  className="max-w-full h-auto"
                  loading="lazy"
                />
                <img
                  src={`https://github-readme-stats-fast.vercel.app/api/top-langs?username=${account.screen_name}&layout=compact&hide_border=true&bg_color=00000000&text_color=666&title_color=3b82f6`}
                  alt="Top Languages"
                  className="max-w-full h-auto"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GithubInline /> Contribution Calendar</CardTitle>
              <CardDescription>Your GitHub contribution activity this year</CardDescription>
            </CardHeader>
            <CardContent>
              {contributions && contributions.length > 0 ? <GithubHeatmap data={contributions} />
                : <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No contribution data. Add a GitHub PAT to fetch contributions.</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Star size={18} /> Top Repositories</CardTitle>
                <CardDescription>Your most starred repos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview.topRepos.map((repo: GithubRepo, i: number) => (
                    <div key={repo.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--muted)]">
                      <span className="text-xs font-bold text-[var(--muted-foreground)] w-5 shrink-0">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-[var(--primary)] transition-colors truncate">
                            {repo.full_name}
                          </a>
                          {repo.language && <Badge className="shrink-0">{repo.language}</Badge>}
                        </div>
                        {repo.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{repo.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span className="flex items-center gap-1"><Star size={12} /> {repo.stars}</span>
                          <span className="flex items-center gap-1"><GitFork size={12} /> {repo.forks}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code size={18} /> Languages</CardTitle>
                <CardDescription>Distribution across your repos</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(overview.languages).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={Object.entries(overview.languages).map(([name, count]) => ({ name, count }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {Object.keys(overview.languages).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No language data.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader><CardTitle>No data yet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">Trigger a fetch from the detail page to retrieve data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
