import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type OverviewStats, type TimelineData, type Account } from "../api";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { MessageSquare, Heart, Repeat2, Eye, Bookmark, TrendingUp, ArrowUpRight } from "lucide-react";

export function Overview() {
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

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>;
  }

  const ghAccounts = (accountsData?.accounts || []).filter((a: Account) => a.platform === "github");
  const xAccounts = (accountsData?.accounts || []).filter((a: Account) => a.platform === "twitter");
  const hasData = xAccounts.length > 0 || ghAccounts.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Overview</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {hasData
            ? `${xAccounts.length + ghAccounts.length} account${(xAccounts.length + ghAccounts.length) !== 1 ? "s" : ""} across ${xAccounts.length > 0 && ghAccounts.length > 0 ? "2 platforms" : xAccounts.length > 0 ? "X" : "GitHub"}`
            : "Add X or GitHub accounts to start tracking"}
        </p>
      </div>

      {/* Accounts summary */}
      <div className="flex flex-wrap gap-3 min-h-[40px]">
        {accountsData?.accounts.map((acc) => (
          <button key={acc.id} onClick={() => navigate(`/${acc.platform === "github" ? "github" : "x"}/${acc.id}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
            <span className={acc.platform === "github" ? "" : "font-semibold"}>{acc.platform === "github" ? "" : "@"}{acc.screen_name}</span>
            <Badge className={acc.platform === "github" ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800 text-[10px] px-1.5" : "text-[10px] px-1.5"}>
              {acc.platform === "github" ? "GH" : "X"}
            </Badge>
            {acc.error_message && <span className="text-red-500">!</span>}
            <ArrowUpRight size={12} className="text-[var(--muted-foreground)]" />
          </button>
        ))}
        {!hasData && (
          <p className="text-sm text-[var(--muted-foreground)] italic self-center">No accounts configured — add one to see it here</p>
        )}
      </div>

      {/* X Stats */}
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          X (Twitter)
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          {xAccounts.length === 0 ? "No X accounts configured. Add one in the X page to see analytics." : `${xAccounts.length} account${xAccounts.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tweets" value={stats?.total_tweets ?? 0} icon={<MessageSquare size={20} />} description={stats ? `${stats.todayTweets} today` : "—"} />
        <StatCard title="Total Likes" value={stats?.total_likes ?? 0} icon={<Heart size={20} />} description={stats ? `${stats.todayLikes} today` : "—"} />
        <StatCard title="Total Retweets" value={stats?.total_retweets ?? 0} icon={<Repeat2 size={20} />} description={stats ? `${stats.todayRetweets} today` : "—"} />
        <StatCard title="Avg Engagement" value={stats?.avgEngagement ?? "0"} icon={<TrendingUp size={20} />} description="per tweet" />
        <StatCard title="Total Views" value={stats?.total_views ?? 0} icon={<Eye size={20} />} />
        <StatCard title="Total Bookmarks" value={stats?.total_bookmarks ?? 0} icon={<Bookmark size={20} />} />
        <StatCard title="Followers" value={stats?.followersCount ?? 0} icon={<TrendingUp size={20} />} description={stats ? `Following ${stats.followingCount}` : "—"} />
      </div>

      {/* GitHub Stats */}
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          GitHub
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          {ghAccounts.length === 0 ? "No GitHub accounts configured. Add one in the GitHub page to see stats." : `${ghAccounts.length} account${ghAccounts.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 min-h-[40px]">
        {ghAccounts.map((acc) => (
          <button key={acc.id} onClick={() => navigate(`/github/${acc.id}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
            <span>{acc.screen_name}</span>
            <ArrowUpRight size={12} className="text-[var(--muted-foreground)]" />
          </button>
        ))}
        {ghAccounts.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)] italic self-center">No GitHub accounts</p>
        )}
      </div>

      {/* Charts — always show containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tweet Activity</CardTitle>
            <CardDescription>Daily tweet count over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="tweets_count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted-foreground)]">
                No tweet activity data yet. Add an X account and fetch tweets to populate this chart.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Engagement</CardTitle>
            <CardDescription>Total likes and retweets per day</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="total_likes" stroke="#ec4899" fill="#ec489920" name="Likes" />
                  <Area type="monotone" dataKey="total_retweets" stroke="#3b82f6" fill="#3b82f620" name="Retweets" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted-foreground)]">
                No engagement data yet. Add an X account and fetch tweets to populate this chart.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top liked tweets */}
      <Card>
        <CardHeader>
          <CardTitle>Top Liked Tweets</CardTitle>
          <CardDescription>Your most popular tweets by likes</CardDescription>
        </CardHeader>
        <CardContent>
          {topLiked && topLiked.length > 0 ? (
            <div className="space-y-3">
              {topLiked.map((tweet) => (
                <div key={tweet.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--muted)]">
                  <Heart size={16} className="text-pink-500 mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-clamp-2">{tweet.full_text}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {new Date(tweet.created_at).toLocaleDateString()} · {tweet.favorite_count} likes · {tweet.retweet_count} RTs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-sm text-[var(--muted-foreground)]">
              No tweets yet. Add an X account and fetch tweets to see your top content here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
