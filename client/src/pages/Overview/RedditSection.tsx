import { useTranslation } from "react-i18next";
import { StatCard } from "../../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { RedditIcon } from "../../components/BrandIcons";
import { MessageSquare, ThumbsUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

interface SubredditDatum { subreddit: string; count: number }

interface Props {
  postKarma: number;
  commentKarma: number;
  totalPosts: number;
  totalComments: number;
  karmaTimeline: { date: string; post_karma: number; comment_karma: number }[];
  dailyActivity: { date: string; posts: number; comments: number }[];
  mergedSubreddits: SubredditDatum[];
}

export function RedditSection({ postKarma, commentKarma, totalPosts, totalComments, karmaTimeline, dailyActivity, mergedSubreddits }: Props) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><RedditIcon /> {t("overview.redditHeading")}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title={t("overview.stats.postKarma")} value={postKarma} icon={<ThumbsUp size={16} />} />
        <StatCard title={t("overview.stats.commentKarma")} value={commentKarma} icon={<MessageSquare size={16} />} />
        <StatCard title={t("overview.stats.redditPosts")} value={totalPosts} icon={<MessageSquare size={16} />} />
        <StatCard title={t("overview.stats.redditComments")} value={totalComments} icon={<MessageSquare size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditKarma")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {karmaTimeline.length > 0 ? (
              <div role="img" aria-label={t("overview.charts.redditKarma")}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={karmaTimeline} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="post_karma" stroke="var(--chart-4)" name={t("overview.charts.redditPostKarma")} dot={false} />
                  <Line type="monotone" dataKey="comment_karma" stroke="var(--chart-1)" name={t("overview.charts.redditCommentKarma")} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("redditDetail.noData")}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditActivity")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {dailyActivity.length > 0 ? (
              <div role="img" aria-label={t("overview.charts.redditActivity")}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="posts" fill="var(--primary)" radius={[3, 3, 0, 0]} name={t("overview.stats.redditPosts")} />
                  <Bar dataKey="comments" fill="var(--chart-4)" radius={[3, 3, 0, 0]} name={t("overview.stats.redditComments")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("redditDetail.noData")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {mergedSubreddits.length > 0 && (
        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.redditSubreddits")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div role="img" aria-label={t("overview.charts.redditSubreddits")}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={mergedSubreddits} dataKey="count" nameKey="subreddit" cx="50%" cy="50%" outerRadius={70} label={(props: { name?: string; value?: number }) => `${props.name ?? ""} (${props.value ?? 0})`} labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 0.5 }}>
                  {mergedSubreddits.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
