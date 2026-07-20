"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { api, type TimelineData, type PaginatedTweets, type Tweet } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/client/datetime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { calcYAxisWidth } from "@/lib/client/utils";
import {
  ArrowLeft, Play, RefreshCw, Trash2, AlertCircle,
  MessageSquare, Heart, Repeat2, Eye, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { useIsMobile } from "@/lib/client/useIsMobile";
import { StatCardSkeleton, ChartCardSkeleton, Skeleton } from "@/components/Skeleton";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";

export default function XDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountId = Number(id);
  const [tab, setTab] = useState<"tweets" | "replies">("tweets");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [days, setDays] = useState(30);

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: tweets } = useQuery<PaginatedTweets>({
    queryKey: ["tweets", accountId],
    queryFn: () => api.getTweets(1, 50, "created_at", "desc", undefined, [accountId], 0),
    enabled: !!accountId,
  });

  const { data: replies } = useQuery<PaginatedTweets>({
    queryKey: ["replies", accountId],
    queryFn: () => api.getTweets(1, 50, "created_at", "desc", undefined, [accountId], 1),
    enabled: !!accountId,
  });

  const { data: timeline } = useQuery<TimelineData>({
    queryKey: ["timeline", accountId, days],
    queryFn: () => api.getTimeline(days, accountId),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => router.push("/x"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const isMobile = useIsMobile();
  const CHART_H = isMobile ? 180 : 250;
  const MARGIN = { top: 5, right: 5, left: 0, bottom: 5 };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="detail-header">
          <div className="detail-header-body">
            <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
            <div className="flex-1"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-3 w-48" /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardSkeleton /><ChartCardSkeleton />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("xDetail.notFound")}</p>
        <button onClick={() => router.push("/x")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("xDetail.backToX")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="detail-header">
        <div className="detail-header-body">
        <button onClick={() => router.push("/x")} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors shrink-0 mt-0.5" title={t("xDetail.backToX")} aria-label={t("xDetail.backToX")}>
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">@{account.screen_name}</h2>
            {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("xDetail.fetchInterval", { minutes: account.fetch_interval })}
            {account.last_fetched_at && ` • ${t("xDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
          </p>
        </div>
        </div>
        <div className="detail-header-actions">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs disabled:opacity-40"
          >
            <Play size={12} /> {triggerMutation.isPending ? t("xDetail.fetching") : t("xDetail.fetchNow")}
          </button>
          <button
            onClick={() => {
              api.updateAccount(accountId, { isActive: !account.is_active }).then(() =>
                queryClient.invalidateQueries({ queryKey: ["account", accountId] })
              );
            }}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
            title={account.is_active ? t("xDetail.disable") : t("xDetail.enable")}
            aria-label={account.is_active ? t("xDetail.disable") : t("xDetail.enable")}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--danger)]/10 transition-colors text-[var(--danger)]"
            title={t("xDetail.delete")}
            aria-label={t("xDetail.delete")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/5 text-[var(--danger)] text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {account.stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 sm:p-4 text-center"><p className="text-2xl font-bold">{account.stats.followers_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.followers")}</p></CardContent></Card>
          <Card><CardContent className="p-4 sm:p-4 text-center"><p className="text-2xl font-bold">{account.stats.following_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.following")}</p></CardContent></Card>
          <Card><CardContent className="p-4 sm:p-4 text-center"><p className="text-2xl font-bold">{account.stats.tweet_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.tweets")}</p></CardContent></Card>
        </div>
      )}

      <div className="mobile-detail-controls">
        <TimeRangeSelector value={days} onChange={setDays} />
      </div>

      {timeline && timeline.dailyTweets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t("xDetail.tweetActivity")}</CardTitle></CardHeader>
            <CardContent>
              <div role="img" aria-label={t("xDetail.tweetActivity")}>
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={timeline.dailyTweets} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(timeline.dailyTweets, "tweets_count")} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="tweets_count" fill="var(--primary)" radius={[4, 4, 0, 0]} name={t("xDetail.tweetsCount")} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("xDetail.views")}</CardTitle></CardHeader>
            <CardContent>
              <div role="img" aria-label={t("xDetail.views")}>
              <ResponsiveContainer width="100%" height={CHART_H}>
                <AreaChart data={timeline.dailyTweets} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(timeline.dailyTweets, "total_views")} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="total_views" stroke="var(--chart-2)" fill="color-mix(in oklch, var(--chart-2) 12%, transparent)" name={t("xDetail.views")} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {timeline && timeline.dailyTweets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t("xDetail.engagement")}</CardTitle></CardHeader>
            <CardContent>
              <div role="img" aria-label={t("xDetail.engagement")}>
              <ResponsiveContainer width="100%" height={CHART_H}>
                <AreaChart data={timeline.dailyTweets} margin={MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={calcYAxisWidth(timeline.dailyTweets, "total_likes", "total_retweets")} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="total_likes" stroke="var(--chart-5)" fill="color-mix(in oklch, var(--chart-5) 12%, transparent)" name={t("xDetail.likes")} />
                  <Area type="monotone" dataKey="total_retweets" stroke="var(--chart-1)" fill="color-mix(in oklch, var(--chart-1) 12%, transparent)" name={t("xDetail.retweets")} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(tweets || replies) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 border-b border-[var(--border)] pb-0">
              <button
                onClick={() => setTab("tweets")}
                className={`min-h-11 border-b-2 pb-3 text-sm font-medium transition-colors ${tab === "tweets" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("xDetail.recentTweets")}
              </button>
              <button
                onClick={() => setTab("replies")}
                className={`min-h-11 border-b-2 pb-3 text-sm font-medium transition-colors ${tab === "replies" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("xDetail.recentReplies")}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tab === "tweets" && tweets && tweets.data.length > 0 && tweets.data.slice(0, 20).map((tweet: Tweet) => (
              <a
                key={tweet.id}
                href={`https://x.com/${account.screen_name}/status/${tweet.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap break-words">{tweet.full_text}</p>
                  <ExternalLink size={12} className="shrink-0 mt-1 text-[var(--muted-foreground)] hover-reveal-icon" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Heart size={12} /> {tweet.favorite_count}</span>
                  <span className="flex items-center gap-1"><Repeat2 size={12} /> {tweet.retweet_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {tweet.reply_count}</span>
                  {tweet.view_count > 0 && <span className="flex items-center gap-1"><Eye size={12} /> {tweet.view_count}</span>}
                  <span>{formatDate(tweet.created_at)}</span>
                </div>
              </a>
            ))}
            {tab === "replies" && replies && replies.data.length > 0 && replies.data.slice(0, 20).map((tweet: Tweet) => (
              <a
                key={tweet.id}
                href={`https://x.com/${account.screen_name}/status/${tweet.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap break-words">{tweet.full_text}</p>
                  <ExternalLink size={12} className="shrink-0 mt-1 text-[var(--muted-foreground)] hover-reveal-icon" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Heart size={12} /> {tweet.favorite_count}</span>
                  <span className="flex items-center gap-1"><Repeat2 size={12} /> {tweet.retweet_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {tweet.reply_count}</span>
                  {tweet.view_count > 0 && <span className="flex items-center gap-1"><Eye size={12} /> {tweet.view_count}</span>}
                  <span>{formatDate(tweet.created_at)}</span>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("xDetail.delete")}
        description={t("xDetail.deleteConfirm", { name: account.screen_name })}
        onConfirm={async () => deleteMutation.mutate()}
      />
    </div>
  );
}
