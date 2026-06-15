import { useTranslation } from "react-i18next";
import { type OverviewStats, type TimelineData, type Tweet, type Account } from "../../api";
import { StatCard } from "../../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { XIcon } from "../../components/BrandIcons";
import { MessageSquare, Heart, Repeat2, Eye, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Props {
  stats: OverviewStats | undefined;
  timeline: TimelineData | undefined;
  topLiked: Tweet[] | undefined;
  xAccounts: Account[];
}

export function XSection({ stats, timeline, topLiked, xAccounts }: Props) {
  const { t } = useTranslation();

  if (xAccounts.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><XIcon /> {t("overview.xHeading")}</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard title={t("overview.stats.tweetCount")} value={stats?.tweet_count ?? 0} icon={<MessageSquare size={16} />} description={stats ? t("overview.stats.today", { count: stats.todayTweets }) : undefined} />
        <StatCard title={t("overview.stats.tweetLikes")} value={(stats?.tweet_likes ?? 0).toLocaleString()} icon={<Heart size={16} />} />
        <StatCard title={t("overview.stats.tweetRetweets")} value={(stats?.tweet_retweets ?? 0).toLocaleString()} icon={<Repeat2 size={16} />} />
        <StatCard title={t("overview.stats.tweetViews")} value={(stats?.tweet_views ?? 0).toLocaleString()} icon={<Eye size={16} />} />
        <StatCard title={t("overview.stats.followers")} value={stats?.followersCount ?? 0} icon={<TrendingUp size={16} />} description={stats ? t("overview.stats.following", { count: stats.followingCount }) : undefined} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title={t("overview.stats.replyCount")} value={stats?.reply_count ?? 0} icon={<MessageSquare size={16} />} />
        <StatCard title={t("overview.stats.replyLikes")} value={(stats?.reply_likes ?? 0).toLocaleString()} icon={<Heart size={16} />} />
        <StatCard title={t("overview.stats.replyRetweets")} value={(stats?.reply_retweets ?? 0).toLocaleString()} icon={<Repeat2 size={16} />} />
        <StatCard title={t("overview.stats.replyViews")} value={(stats?.reply_views ?? 0).toLocaleString()} icon={<Eye size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.tweetActivity")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <div role="img" aria-label={t("overview.charts.tweetActivity")}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="tweets_count" fill="var(--primary)" radius={[3, 3, 0, 0]} name={t("overview.charts.tweetsCount")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noTweetData")}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.dailyEngagement")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <div role="img" aria-label={t("overview.charts.dailyEngagement")}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="total_likes" stroke="var(--chart-5)" fill="color-mix(in oklch, var(--chart-5) 12%, transparent)" name={t("overview.charts.likes")} />
                  <Area type="monotone" dataKey="total_retweets" stroke="var(--chart-1)" fill="color-mix(in oklch, var(--chart-1) 12%, transparent)" name={t("overview.charts.retweets")} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noEngagementData")}</div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-[var(--muted-foreground)]">{t("overview.charts.dailyViews")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {timeline?.dailyTweets && timeline.dailyTweets.length > 0 ? (
              <div role="img" aria-label={t("overview.charts.dailyViews")}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="total_views" stroke="var(--chart-2)" fill="color-mix(in oklch, var(--chart-2) 12%, transparent)" name={t("overview.charts.views")} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-xs text-[var(--muted-foreground)]">{t("overview.charts.noTweetData")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {topLiked && topLiked.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.charts.topLiked")}</p>
          {topLiked.slice(0, 3).map((tweet) => (
            <div key={tweet.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-[var(--muted)] text-xs">
              <Heart size={12} className="text-[var(--chart-5)] mt-0.5 shrink-0" />
              <span className="line-clamp-1 flex-1">{tweet.full_text}</span>
              <span className="text-[var(--muted-foreground)] shrink-0">{tweet.favorite_count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
