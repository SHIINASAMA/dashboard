import { useQuery } from "@tanstack/react-query";
import { api, type OverviewStats, type TimelineData } from "../api";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { MessageSquare, Heart, Repeat2, Eye, Bookmark, TrendingUp, CalendarDays } from "lucide-react";

export function Overview() {
  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
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

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tweets"
          value={stats.total_tweets}
          icon={<MessageSquare size={20} />}
          description={`${stats.todayTweets} today`}
        />
        <StatCard
          title="Total Likes"
          value={stats.total_likes}
          icon={<Heart size={20} />}
          description={`${stats.todayLikes} today`}
        />
        <StatCard
          title="Total Retweets"
          value={stats.total_retweets}
          icon={<Repeat2 size={20} />}
          description={`${stats.todayRetweets} today`}
        />
        <StatCard
          title="Avg Engagement"
          value={stats.avgEngagement}
          icon={<TrendingUp size={20} />}
          description="per tweet"
        />
        <StatCard
          title="Total Views"
          value={stats.total_views}
          icon={<Eye size={20} />}
        />
        <StatCard
          title="Total Bookmarks"
          value={stats.total_bookmarks}
          icon={<Bookmark size={20} />}
        />
        <StatCard
          title="Total Replies"
          value={stats.total_replies}
          icon={<MessageSquare size={20} />}
        />
        <StatCard
          title="Followers"
          value={stats.followersCount}
          icon={<CalendarDays size={20} />}
          description={`Following ${stats.followingCount}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tweet activity over time */}
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
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="tweets_count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
                No tweet data yet. Run the fetch script to populate data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Engagement over time */}
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
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Area type="monotone" dataKey="total_likes" stroke="#ec4899" fill="#ec489920" name="Likes" />
                  <Area type="monotone" dataKey="total_retweets" stroke="#3b82f6" fill="#3b82f620" name="Retweets" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
                No engagement data yet.
              </p>
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
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No tweets yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
