import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { api, type TimelineData, type PaginatedTweets, type Tweet } from "../api";
import { formatDateTime, formatDate } from "../lib/datetime";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft, Play, RefreshCw, Trash2, AlertCircle,
  MessageSquare, Heart, Repeat2, Eye, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

export function XDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountId = Number(id);
  const [tab, setTab] = useState<"tweets" | "replies">("tweets");

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
    queryKey: ["timeline", accountId],
    queryFn: () => api.getTimeline(6, accountId),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => navigate("/x"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("xDetail.notFound")}</p>
        <button onClick={() => navigate("/x")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("xDetail.backToX")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/x")} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors" title={t("xDetail.backToX")} aria-label={t("xDetail.backToX")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">@{account.screen_name}</h2>
            {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("xDetail.fetchInterval", { minutes: account.fetch_interval })}
            {account.last_fetched_at && ` • ${t("xDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm disabled:opacity-40"
          >
            <Play size={14} /> {triggerMutation.isPending ? t("xDetail.fetching") : t("xDetail.fetchNow")}
          </button>
          <button
            onClick={() => {
              api.updateAccount(accountId, { isActive: !account.is_active }).then(() =>
                queryClient.invalidateQueries({ queryKey: ["account", accountId] })
              );
            }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
            title={account.is_active ? t("xDetail.disable") : t("xDetail.enable")}
            aria-label={account.is_active ? t("xDetail.disable") : t("xDetail.enable")}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { if (confirm(t("xDetail.deleteConfirm", { name: account.screen_name }))) deleteMutation.mutate(); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
            title={t("xDetail.delete")}
            aria-label={t("xDetail.delete")}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {account.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.followers_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.followers")}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.following_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.following")}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.tweet_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">{t("xDetail.tweets")}</p></CardContent></Card>
        </div>
      )}

      {timeline && timeline.dailyTweets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t("xDetail.tweetActivity")}</CardTitle></CardHeader>
            <CardContent>
              <div role="img" aria-label={t("xDetail.tweetActivity")}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
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
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="total_views" stroke="#10b981" fill="#10b98120" name={t("xDetail.views")} />
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
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="total_likes" stroke="#ec4899" fill="#ec489920" name={t("xDetail.likes")} />
                  <Area type="monotone" dataKey="total_retweets" stroke="#3b82f6" fill="#3b82f620" name={t("xDetail.retweets")} />
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
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === "tweets" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {t("xDetail.recentTweets")}
              </button>
              <button
                onClick={() => setTab("replies")}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === "replies" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
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
                  <ExternalLink size={12} className="shrink-0 mt-1 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
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
                  <ExternalLink size={12} className="shrink-0 mt-1 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
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
    </div>
  );
}
