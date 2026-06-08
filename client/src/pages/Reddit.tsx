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

function RedditIcon({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547.8-3.747c.104-.487.548-.83 1.051-.83.585 0 1.06.475 1.06 1.06a1.032 1.032 0 0 1-.86 1.022l-.206.034.244 2.538c.09-.004.183-.01.277-.01.264 0 .518.048.753.134zm-11.799.434c1.518 0 2.66.625 3.722 1.484 2.237-1.545 5.383-1.892 7.07-1.76l-1.1 5.08c.004.042.006.085.006.128 0 2.78-3.147 5.044-7.016 5.044-3.87 0-7.017-2.263-7.017-5.044 0-.043.002-.086.006-.128l-1.1-5.08c1.687-.132 4.833.215 7.07 1.76 1.062-.86 2.204-1.484 3.722-1.484h.637zM12 16.801c-2.03 0-3.676-.992-3.676-2.216s1.646-2.216 3.676-2.216 3.676.992 3.676 2.216-1.647 2.216-3.676 2.216zm0-3.829a1.728 1.728 0 0 0 0 3.457 1.728 1.728 0 0 0 0-3.457zm3.075 1.228a.74.74 0 1 0 0 1.48.74.74 0 0 0 0-1.48zm-6.15 0a.74.74 0 1 0 0 1.48.74.74 0 0 0 0-1.48z" />
    </svg>
  );
}

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
