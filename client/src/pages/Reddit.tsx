import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type Account } from "../api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddAccountForm from "../components/AddAccountForm";
import { formatDateTime } from "../lib/i18n";
import { Plus, Play, Trash2, AlertCircle, ArrowUpRight, MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";
import { RedditIcon } from "../components/BrandIcons";

export function Reddit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 10_000,
  });

  const redditAccounts = (data?.accounts || []).filter((a: Account) => a.platform === "reddit");

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
        <div className="flex items-center gap-3">
          <RedditIcon size={24} />
          <div>
            <h2 className="text-xl font-semibold">{t("reddit.heading")}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {redditAccounts.length > 0
                ? t("reddit.accounts_other", { count: redditAccounts.length })
                : t("reddit.description")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> {t("reddit.addAccount")}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">{t("reddit.whatYouCanTrack")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <ThumbsUp size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("reddit.preview.karma")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.karmaDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <MessageSquare size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("reddit.preview.posts")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.postsDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <TrendingUp size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("reddit.preview.score")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.scoreDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <MessageSquare size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("reddit.preview.comments")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.commentsDesc")}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">
          {redditAccounts.length > 0 ? t("reddit.configuredAccounts") : t("reddit.noAccounts")}
        </h3>
        {redditAccounts.length > 0 ? (
          <div className="space-y-3">
            {redditAccounts.map((account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              const isStale = lastFetched && (Date.now() - lastFetched.getTime()) > (account.fetch_interval || 30) * 60 * 1000;

              return (
                <Card key={account.id} className={"group " + (!account.is_active ? "opacity-60 " : "") + "cursor-pointer hover:border-[var(--primary)]/50 transition-colors"} onClick={() => navigate(`/reddit/${account.id}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{account.screen_name}</span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Badge className="text-[10px] px-1.5">{t("badge.reddit")}</Badge>
                          {account.auth_type === "reddit_public" && <Badge className="text-[10px] px-1.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">{t("badge.redditPublic")}</Badge>}
                          {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
                          {account.error_message && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{t("badge.error")}</Badge>}
                          {isStale && account.is_active ? <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{t("badge.stale")}</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>{t("reddit.accountCard.interval", { minutes: account.fetch_interval })}</span>
                          {lastFetched && <span>{t("reddit.accountCard.last", { date: formatDateTime(lastFetched) })}</span>}
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
                          title={t("reddit.accountCard.fetchNow")}
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
                          title={t("reddit.accountCard.delete")}
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
                <RedditIcon size={32} />
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("reddit.emptyState")}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> {t("reddit.addFirstAccount")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} defaultPlatform="reddit" />}
    </div>
  );
}
