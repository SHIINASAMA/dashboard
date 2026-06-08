import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type RedditOverview, type RedditPost, type RedditComment } from "../api";
import { formatDateTime } from "../lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/StatCard";
import { ArrowLeft, ArrowUpRight, Play, RefreshCw, Trash2, AlertCircle, ThumbsUp, MessageSquare, TrendingUp, FileText } from "lucide-react";

function RedditIconInner({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547.8-3.747c.104-.487.548-.83 1.051-.83.585 0 1.06.475 1.06 1.06a1.032 1.032 0 0 1-.86 1.022l-.206.034.244 2.538c.09-.004.183-.01.277-.01.264 0 .518.048.753.134zm-11.799.434c1.518 0 2.66.625 3.722 1.484 2.237-1.545 5.383-1.892 7.07-1.76l-1.1 5.08c.004.042.006.085.006.128 0 2.78-3.147 5.044-7.016 5.044-3.87 0-7.017-2.263-7.017-5.044 0-.043.002-.086.006-.128l-1.1-5.08c1.687-.132 4.833.215 7.07 1.76 1.062-.86 2.204-1.484 3.722-1.484h.637z" />
    </svg>
  );
}

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
          <RedditIconInner size={18} />
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
