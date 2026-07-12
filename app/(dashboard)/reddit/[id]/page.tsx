"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { api, type RedditOverview, type RedditPost, type RedditComment } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/client/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatCard } from "@/components/StatCard";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { calcYAxisWidth } from "@/lib/client/utils";
import { ArrowLeft, ArrowUpRight, Play, RefreshCw, Trash2, AlertCircle, ThumbsUp, MessageSquare, TrendingUp, FileText } from "lucide-react";
import { useIsMobile } from "@/lib/client/useIsMobile";
import { RedditIcon } from "@/components/BrandIcons";
import { StatCardSkeleton, ChartCardSkeleton, Skeleton } from "@/components/Skeleton";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function RedditDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountId = Number(id);
  const [days, setDays] = useState(30);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<RedditOverview>({
    queryKey: ["reddit", "overview", accountId],
    queryFn: () => api.getRedditOverview(accountId!),
    enabled: !!accountId,
    refetchInterval: 3 * 60_000,
  });

  const { data: postsData } = useQuery({
    queryKey: ["reddit", "posts", accountId, 1],
    queryFn: () => api.getRedditPosts(accountId!, 1, 50, "score"),
    enabled: !!accountId,
  });

  const { data: commentsData } = useQuery({
    queryKey: ["reddit", "comments", accountId, 1],
    queryFn: () => api.getRedditComments(accountId!, 1, 50),
    enabled: !!accountId,
  });

  const { data: timeline } = useQuery({
    queryKey: ["reddit", "timeline", accountId, days],
    queryFn: () => api.getRedditTimeline(accountId!, days),
    enabled: !!accountId,
  });

  const { data: activity } = useQuery({
    queryKey: ["reddit", "activity", accountId, days],
    queryFn: () => api.getRedditActivity(accountId!, days),
    enabled: !!accountId,
  });

  const { data: subreddits } = useQuery({
    queryKey: ["reddit", "subreddits", accountId],
    queryFn: () => api.getRedditSubreddits(accountId!),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => router.push("/reddit"),
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const _triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const isMobile = useIsMobile();
  const CHART_H = isMobile ? 180 : 250;
  const MARGIN = { top: 5, right: 5, left: 0, bottom: 5 };

  const legendPayload = timeline && timeline.length > 1 ? [
    { value: t("redditDetail.postKarma"), color: "var(--chart-4)" },
    { value: t("redditDetail.commentKarma"), color: "var(--chart-1)" },
  ] : [];

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <div className="detail-header">
          <div className="detail-header-body">
            <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
            <div className="flex-1"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-3 w-48" /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ChartCardSkeleton />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("redditDetail.notFound")}</p>
        <button onClick={() => router.push("/reddit")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("redditDetail.backToReddit")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="detail-header">
        <div className="detail-header-body">
        <button onClick={() => router.push("/reddit")} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors shrink-0 mt-0.5" title={t("redditDetail.backToReddit")} aria-label={t("redditDetail.backToReddit")}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <RedditIcon size={18} className="shrink-0 mt-1" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{account.screen_name}</h2>
              {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("redditDetail.fetchInterval", { minutes: account.fetch_interval })}
              {account.last_fetched_at && ` • ${t("redditDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
            </p>
          </div>
        </div>
        </div>
        <div className="detail-header-actions">
          <button onClick={() => _triggerMutation.mutate()} disabled={_triggerMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs disabled:opacity-40">
            <Play size={12} /> {_triggerMutation.isPending ? t("redditDetail.fetching") : t("redditDetail.fetchNow")}
          </button>
          <button onClick={() => { api.updateAccount(accountId, { isActive: !account.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["account", accountId] })); }}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors" title={account.is_active ? t("redditDetail.disable") : t("redditDetail.enable")} aria-label={account.is_active ? t("redditDetail.disable") : t("redditDetail.enable")}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowDeleteDialog(true)}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--danger)]/10 transition-colors text-[var(--danger)]" title={t("redditDetail.delete")} aria-label={t("redditDetail.delete")}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/5 text-[var(--danger)] text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {overviewLoading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">{t("redditDetail.loadingData")}</div>
      ) : overview ? (
        <>
          <div className="flex items-center justify-end">
            <TimeRangeSelector value={days} onChange={setDays} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t("redditDetail.postKarma")} value={overview.stats?.post_karma ?? 0} icon={<ThumbsUp size={20} />} />
            <StatCard title={t("redditDetail.commentKarma")} value={overview.stats?.comment_karma ?? 0} icon={<MessageSquare size={20} />} />
            <StatCard title={t("redditDetail.totalPosts")} value={overview.totalPosts} icon={<FileText size={20} />} />
            <StatCard title={t("redditDetail.totalScore")} value={overview.totalScore.toLocaleString()} icon={<TrendingUp size={20} />} />
          </div>

          {/* ── Karma Timeline ── */}
          {timeline && timeline.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> {t("redditDetail.karmaTimeline")}</CardTitle>
                <CardDescription>{t("redditDetail.karmaTimelineDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div role="img" aria-label={t("redditDetail.karmaTimeline")}>
                <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mb-2 ${isMobile ? "text-[10px]" : "text-xs"}`}>
                  {legendPayload.map((e) => (
                    <span key={e.value} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="text-[var(--muted-foreground)]">{e.value}</span>
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <LineChart data={timeline} margin={MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(timeline, "post_karma", "comment_karma")} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="post_karma" stroke="var(--chart-4)" name={t("redditDetail.postKarma")} dot={false} />
                    <Line type="monotone" dataKey="comment_karma" stroke="var(--chart-1)" name={t("redditDetail.commentKarma")} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Daily Activity + Subreddit Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activity && (activity.posts.length > 0 || activity.comments.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText size={18} /> {t("redditDetail.dailyActivity")}</CardTitle>
                  <CardDescription>{t("redditDetail.dailyActivityDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div role="img" aria-label={t("redditDetail.dailyActivity")}>
                  <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mb-2 ${isMobile ? "text-[10px]" : "text-xs"}`}>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--chart-4)" }} /><span className="text-[var(--muted-foreground)]">{t("redditDetail.totalPosts")}</span></span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--chart-1)" }} /><span className="text-[var(--muted-foreground)]">{t("redditDetail.recentComments")}</span></span>
                  </div>
                  <ResponsiveContainer width="100%" height={CHART_H}>
                    <BarChart data={(() => {
                      const map: Record<string, { date: string; posts: number; comments: number }> = {};
                      for (const p of activity.posts) map[p.date] = { ...map[p.date], date: p.date, posts: p.count, comments: 0 };
                      for (const c of activity.comments) {
                        if (map[c.date]) map[c.date].comments = c.count;
                        else map[c.date] = { date: c.date, posts: 0, comments: c.count };
                      }
                      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
                    })()} margin={MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth((() => {
                        const map: Record<string, { date: string; posts: number; comments: number }> = {};
                        for (const p of activity.posts) map[p.date] = { ...map[p.date], date: p.date, posts: p.count, comments: 0 };
                        for (const c of activity.comments) {
                          if (map[c.date]) map[c.date].comments = c.count;
                          else map[c.date] = { date: c.date, posts: 0, comments: c.count };
                        }
                        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
                      })(), "posts", "comments")} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                      <Bar dataKey="posts" fill="var(--chart-4)" name={t("redditDetail.totalPosts")} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" fill="var(--chart-1)" name={t("redditDetail.recentComments")} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            {subreddits && subreddits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ThumbsUp size={18} /> {t("redditDetail.topSubreddits")}</CardTitle>
                  <CardDescription>{t("redditDetail.topSubredditsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div role="img" aria-label={t("redditDetail.topSubreddits")}>
                  <ResponsiveContainer width="100%" height={CHART_H}>
                    <PieChart>
                      <Pie data={subreddits} dataKey="count" nameKey="subreddit" cx="50%" cy="50%" outerRadius={80} label={(props: { name?: string; value?: number }) => `r/${props.name ?? ""} (${props.value ?? 0})`}>
                        {subreddits.map((_, i) => (
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp size={18} /> {t("redditDetail.topPosts")}</CardTitle>
              <CardDescription>{t("redditDetail.topPostsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {postsData?.data && postsData.data.length > 0 ? (
                <div className="space-y-2">
                  {postsData.data.slice(0, 10).map((post: RedditPost) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--muted)]">
                      <ThumbsUp size={16} className="text-[var(--chart-4)] mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a href={`https://reddit.com${post.permalink}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline line-clamp-2">{post.title}</a>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span>r/{post.subreddit}</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {post.score.toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {post.num_comments.toLocaleString()}</span>
                          <span>{formatDate(new Date(post.created_utc * 1000))}</span>
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-[var(--muted-foreground)] shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t("redditDetail.noPosts")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare size={18} /> {t("redditDetail.recentComments")}</CardTitle>
              <CardDescription>{t("redditDetail.recentCommentsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {commentsData?.data && commentsData.data.length > 0 ? (
                <div className="space-y-2">
                  {commentsData.data.slice(0, 10).map((comment: RedditComment) => (
                    <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--muted)]">
                      <MessageSquare size={16} className="text-[var(--chart-1)] mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm line-clamp-3">{comment.body}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span>r/{comment.subreddit}</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {comment.score.toLocaleString()}</span>
                          <span>{formatDate(new Date(comment.created_utc * 1000))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t("redditDetail.noComments")}</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t("redditDetail.noData")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">{t("redditDetail.noDataDesc")}</p>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("redditDetail.delete")}
        description={t("redditDetail.deleteConfirm", { name: account.screen_name })}
        onConfirm={async () => deleteMutation.mutate()}
      />
    </div>
  );
}
