import { useQuery } from "@tanstack/react-query";
import { api, type TimelineData, type Tweet, type CalendarDay } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Heart, Repeat2, Eye, MessageSquare, Bookmark } from "lucide-react";

function CalendarHeatmap({ data }: { data: CalendarDay[] }) {
  const now = new Date();
  const year = now.getFullYear();

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const dayMap = new Map(data.map((d) => [d.date, d.count]));
  const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
  let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const day = { date: key, count: dayMap.get(key) || 0, dayOfWeek: d.getDay() };
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
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
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={`${day.date}: ${day.count} tweets`}
              />
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

const METRICS = [
  { key: "favorite_count", label: "Likes", icon: Heart, color: "#ec4899" },
  { key: "retweet_count", label: "Retweets", icon: Repeat2, color: "#3b82f6" },
  { key: "reply_count", label: "Replies", icon: MessageSquare, color: "#8b5cf6" },
  { key: "view_count", label: "Views", icon: Eye, color: "#14b8a6" },
  { key: "bookmark_count", label: "Bookmarks", icon: Bookmark, color: "#f59e0b" },
];

export function Analytics() {
  const { data: timeline } = useQuery<TimelineData>({
    queryKey: ["timeline", 12],
    queryFn: () => api.getTimeline(12),
  });

  const { data: calendarData } = useQuery<CalendarDay[]>({
    queryKey: ["calendar"],
    queryFn: () => api.getCalendar(),
  });

  const { data: topLikes } = useQuery<Tweet[]>({
    queryKey: ["top", "favorite_count", 5],
    queryFn: () => api.getTopTweets("favorite_count", 5),
  });

  const { data: topRetweets } = useQuery<Tweet[]>({
    queryKey: ["top", "retweet_count", 5],
    queryFn: () => api.getTopTweets("retweet_count", 5),
  });

  const { data: topReplies } = useQuery<Tweet[]>({
    queryKey: ["top", "reply_count", 5],
    queryFn: () => api.getTopTweets("reply_count", 5),
  });

  const { data: topViews } = useQuery<Tweet[]>({
    queryKey: ["top", "view_count", 5],
    queryFn: () => api.getTopTweets("view_count", 5),
  });

  const { data: topBookmarks } = useQuery<Tweet[]>({
    queryKey: ["top", "bookmark_count", 5],
    queryFn: () => api.getTopTweets("bookmark_count", 5),
  });

  const topData: Record<string, Tweet[] | undefined> = {
    favorite_count: topLikes,
    retweet_count: topRetweets,
    reply_count: topReplies,
    view_count: topViews,
    bookmark_count: topBookmarks,
  };

  return (
    <div className="space-y-8">
      {/* Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Tweet Calendar</CardTitle>
          <CardDescription>GitHub-style contribution heatmap of your tweets</CardDescription>
        </CardHeader>
        <CardContent>
          {calendarData && calendarData.length > 0 ? (
            <CalendarHeatmap data={calendarData} />
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Engagement by metric */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {METRICS.map(({ key, label, icon: Icon, color }) => {
          const topTweets = topData[key];
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon size={18} style={{ color }} />
                  Top by {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topTweets && topTweets.length > 0 ? (
                  <div className="space-y-2">
                    {topTweets.slice(0, 5).map((tweet, i) => (
                      <div key={tweet.id} className="flex items-start gap-3 p-2 rounded-lg bg-[var(--muted)]">
                        <span className="text-xs font-bold text-[var(--muted-foreground)] w-5 shrink-0 mt-0.5">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs line-clamp-2">{tweet.full_text}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {new Date(tweet.created_at).toLocaleDateString()} · {tweet[key as keyof Tweet]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No data</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeline charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Follower Growth</CardTitle>
            <CardDescription>How your audience has grown</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.followerGrowth && timeline.followerGrowth.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeline.followerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="followers_count" stroke="#3b82f6" fill="#3b82f620" name="Followers" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
                Run fetch-my-stats multiple times to see growth data.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumulative Engagement</CardTitle>
            <CardDescription>Total likes + retweets + replies over time</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="total_likes" fill="#ec4899" radius={[4, 4, 0, 0]} name="Likes" stackId="a" />
                  <Bar dataKey="total_retweets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Retweets" stackId="a" />
                  <Bar dataKey="total_replies" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Replies" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-12">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
