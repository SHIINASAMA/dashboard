import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type RedditOverview, type RedditPost, type RedditComment } from "../api";
import { formatDateTime } from "../lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/StatCard";
import { ArrowLeft, ArrowUpRight, Play, RefreshCw, Trash2, AlertCircle, ThumbsUp, MessageSquare, TrendingUp, FileText } from "lucide-react";
import { RedditIcon } from "../components/BrandIcons";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function RedditDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountId = Number(id);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery<RedditOverview>({
    queryKey: ["reddit", "overview", accountId],
    queryFn: () => api.getRedditOverview(accountId!),
    enabled: !!accountId,
    refetchInterval: 30_000,
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
    queryKey: ["reddit", "timeline", accountId],
    queryFn: () => api.getRedditTimeline(accountId!),
    enabled: !!accountId,
  });

  const { data: activity } = useQuery({
    queryKey: ["reddit", "activity", accountId],
    queryFn: () => api.getRedditActivity(accountId!),
    enabled: !!accountId,
  });

  const { data: subreddits } = useQuery({
    queryKey: ["reddit", "subreddits", accountId],
    queryFn: () => api.getRedditSubreddits(accountId!),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => navigate("/reddit"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
  });

  if (accountLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("redditDetail.notFound")}</p>
        <button onClick={() => navigate("/reddit")} className="mt-4 text-sm text-[var(--primary)] hover:underline">{t("redditDetail.backToReddit")}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/reddit")} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <RedditIcon size={18} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{account.screen_name}</h2>
              {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("redditDetail.fetchInterval", { minutes: account.fetch_interval })}
              {account.last_fetched_at && ` • ${t("redditDetail.lastFetched", { date: formatDateTime(account.last_fetched_at) })}`}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm disabled:opacity-40">
            <Play size={14} /> {triggerMutation.isPending ? t("redditDetail.fetching") : t("redditDetail.fetchNow")}
          </button>
          <button onClick={() => { api.updateAccount(accountId, { isActive: !account.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["account", accountId] })); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors" title={account.is_active ? t("redditDetail.disable") : t("redditDetail.enable")}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { if (confirm(t("redditDetail.deleteConfirm", { name: account.screen_name }))) deleteMutation.mutate(); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500" title={t("redditDetail.delete")}>
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
        <div className="text-center py-12 text-[var(--muted-foreground)]">{t("redditDetail.loadingData")}</div>
      ) : overview ? (
        <>
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
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                    <Legend />
                    <Line type="monotone" dataKey="post_karma" stroke="#f97316" name={t("redditDetail.postKarma")} dot={false} />
                    <Line type="monotone" dataKey="comment_karma" stroke="#3b82f6" name={t("redditDetail.commentKarma")} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(() => {
                      const map: Record<string, { date: string; posts: number; comments: number }> = {};
                      for (const p of activity.posts) map[p.date] = { ...map[p.date], date: p.date, posts: p.count, comments: 0 };
                      for (const c of activity.comments) {
                        if (map[c.date]) map[c.date].comments = c.count;
                        else map[c.date] = { date: c.date, posts: 0, comments: c.count };
                      }
                      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                      <Legend />
                      <Bar dataKey="posts" fill="#f97316" name={t("redditDetail.totalPosts")} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" fill="#3b82f6" name={t("redditDetail.recentComments")} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={subreddits} dataKey="count" nameKey="subreddit" cx="50%" cy="50%" outerRadius={80} label={({ subreddit, count }) => `r/${subreddit} (${count})`}>
                        {subreddits.map((_, i) => (
                          <Cell key={i} fill={["#f97316", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#84cc16"][i % 10]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
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
                      <ThumbsUp size={16} className="text-orange-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a href={`https://reddit.com${post.permalink}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline line-clamp-2">{post.title}</a>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span>r/{post.subreddit}</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {post.score.toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {post.num_comments.toLocaleString()}</span>
                          <span>{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
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
                      <MessageSquare size={16} className="text-blue-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm line-clamp-3">{comment.body}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mt-1">
                          <span>r/{comment.subreddit}</span>
                          <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {comment.score.toLocaleString()}</span>
                          <span>{new Date(comment.created_utc * 1000).toLocaleDateString()}</span>
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
    </div>
  );
}
