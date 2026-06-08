import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type Account } from "../api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/StatCard";
import AddAccountForm from "../components/AddAccountForm";
import { formatDateTime } from "../lib/i18n";
import { Plus, Play, Trash2, AlertCircle, ArrowUpRight, MessageSquare, Heart, Repeat2, Eye, TrendingUp } from "lucide-react";

export function X() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 10_000,
  });

  const xAccounts = (data?.accounts || []).filter((a: Account) => a.platform === "twitter");
  const overview = data?.overview;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: number) => api.triggerFetch(id),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            {t("x.heading")}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {xAccounts.length > 0
              ? t("x.accounts_other", { count: xAccounts.length })
              : t("x.description")}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> {t("x.addAccount")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("overview.stats.totalTweets")} value={overview?.total_tweets ?? 0} icon={<MessageSquare size={20} />} description={overview ? t("overview.stats.today", { count: overview.todayTweets }) : t("overview.stats.dash")} />
        <StatCard title={t("overview.stats.totalLikes")} value={overview?.total_likes ?? 0} icon={<Heart size={20} />} description={overview ? t("overview.stats.today", { count: overview.todayLikes }) : t("overview.stats.dash")} />
        <StatCard title={t("overview.stats.totalRetweets")} value={overview?.total_retweets ?? 0} icon={<Repeat2 size={20} />} description={overview ? t("overview.stats.today", { count: overview.todayRetweets }) : t("overview.stats.dash")} />
        <StatCard title={t("overview.stats.avgEngagement")} value={overview?.avgEngagement ?? "0"} icon={<TrendingUp size={20} />} description={t("overview.stats.perTweet")} />
        <StatCard title={t("overview.stats.totalViews")} value={overview?.total_views ?? 0} icon={<Eye size={20} />} />
        <StatCard title={t("overview.stats.followers")} value={overview?.followersCount ?? 0} icon={<TrendingUp size={20} />} description={overview ? t("overview.stats.following", { count: overview.followingCount }) : t("overview.stats.dash")} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">
          {xAccounts.length > 0 ? t("x.configuredAccounts") : t("x.noAccounts")}
        </h3>
        {xAccounts.length > 0 ? (
          <div className="space-y-3">
            {xAccounts.map((account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              const isStale = lastFetched && (Date.now() - lastFetched.getTime()) > (account.fetch_interval || 30) * 60 * 1000;

              return (
                <Card key={account.id} className={"group " + (!account.is_active ? "opacity-60 " : "") + "cursor-pointer hover:border-[var(--primary)]/50 transition-colors"} onClick={() => navigate(`/x/${account.id}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">@{account.screen_name}</span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
                          {account.error_message && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{t("badge.error")}</Badge>}
                          {isStale && account.is_active ? <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{t("badge.stale")}</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>{t("x.accountCard.interval", { minutes: account.fetch_interval })}</span>
                          {lastFetched && <span>{t("x.accountCard.last", { date: formatDateTime(lastFetched) })}</span>}
                          {account.stats && (
                            <>
                              <span>{t("x.accountCard.followers", { count: account.stats.followers_count.toLocaleString() })}</span>
                              <span>{t("x.accountCard.tweets", { count: account.stats.tweet_count.toLocaleString() })}</span>
                            </>
                          )}
                        </div>
                        {account.error_message && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                            <AlertCircle size={12} /> {account.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerMutation.mutate(account.id); }}
                          disabled={triggerMutation.isPending}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                          title={t("x.accountCard.fetchNow")}
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
                          title={t("x.accountCard.delete")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <MessageSquare size={32} className="text-[var(--muted-foreground)] opacity-30" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("x.emptyState")}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> {t("x.addFirstAccount")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} defaultPlatform="twitter" />}
    </div>
  );
}
