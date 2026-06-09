import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type Account } from "../api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import EditAccountForm from "../components/EditAccountForm";
import { formatDateTime } from "../lib/i18n";
import { Pencil, Plus, PlayCircle, PauseCircle, Trash2, AlertCircle, ArrowUpRight, Star, GitFork, Users, BookOpen } from "lucide-react";
import { GitlabIcon } from "../components/BrandIcons";

export function GitLab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 10_000,
  });

  const glAccounts = (data?.accounts || []).filter((a: Account) => a.platform === "gitlab");

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: number) => api.triggerFetch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateAccount(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitlabIcon size={24} />
          <div>
            <h2 className="text-xl font-semibold">{t("gitlab.heading")}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {glAccounts.length > 0
                ? t("gitlab.accounts_other", { count: glAccounts.length })
                : t("gitlab.description")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> {t("gitlab.addAccount")}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">{t("gitlab.whatYouCanTrack")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <Star size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("gitlab.preview.stars")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("gitlab.preview.starsDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <GitFork size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("gitlab.preview.forks")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("gitlab.preview.forksDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <Users size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("gitlab.preview.followerGrowth")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("gitlab.preview.followerGrowthDesc")}</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <BookOpen size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">{t("gitlab.preview.languages")}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t("gitlab.preview.languagesDesc")}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">
          {glAccounts.length > 0 ? t("gitlab.configuredAccounts") : t("gitlab.noAccounts")}
        </h3>
        {glAccounts.length > 0 ? (
          <div className="space-y-3">
            {glAccounts.map((account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              const isStale = lastFetched && (Date.now() - lastFetched.getTime()) > (account.fetch_interval || 30) * 60 * 1000;
              const instanceLabel = account.instance_url
                ? new URL(account.instance_url).hostname
                : "gitlab.com";

              return (
                <Card key={account.id} className={"group " + (!account.is_active ? "opacity-60 " : "") + "cursor-pointer hover:border-[var(--primary)]/50 transition-colors"} onClick={() => navigate(`/gitlab/${account.id}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{account.screen_name}</span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Badge className="text-[10px] px-1.5">{t("badge.gitlab")}</Badge>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{instanceLabel}</span>
                          {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
                          {account.error_message && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{t("badge.error")}</Badge>}
                          {isStale && account.is_active ? <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{t("badge.stale")}</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>{t("gitlab.accountCard.interval", { minutes: account.fetch_interval })}</span>
                          {lastFetched && <span>{t("gitlab.accountCard.last", { date: formatDateTime(lastFetched) })}</span>}
                        </div>
                        {account.error_message && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                            <AlertCircle size={12} /> {account.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditAccount(account); }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                          title={t("gitlab.accountCard.edit")}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActiveMutation.mutate({ id: account.id, isActive: !account.is_active }); }}
                          disabled={toggleActiveMutation.isPending}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                          title={t("gitlab.accountCard.fetchNow")}
                        >
                          {account.is_active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
                          title={t("gitlab.accountCard.delete")}
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
                <GitlabIcon size={32} />
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("gitlab.emptyState")}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> {t("gitlab.addFirstAccount")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} defaultPlatform="gitlab" />}
      {editAccount && <EditAccountForm account={editAccount} onClose={() => setEditAccount(null)} />}
    </div>
  );
}
