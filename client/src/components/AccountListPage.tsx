import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type Account } from "../api";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import AddAccountForm from "./AddAccountForm";
import EditAccountForm from "./EditAccountForm";
import { formatDateTime } from "../lib/i18n";
import { Pencil, Plus, PlayCircle, PauseCircle, Trash2, AlertCircle, ArrowUpRight } from "lucide-react";

export interface AccountListPageProps {
  platform: "twitter" | "github" | "gitlab" | "reddit";
  heading: string;
  description: string | ((count: number) => string);
  icon: React.ComponentType<{ size?: number }>;
  emptyIcon?: React.ReactNode;
  emptyText: string;
  addFirstLabel: string;
  addLabel: string;
  renderHeader?: () => React.ReactNode;
  renderBadge?: (account: Account) => React.ReactNode;
  renderMeta?: (account: Account) => React.ReactNode;
  formatUsername?: (account: Account) => string;
}

const PLATFORM_PREFIX: Record<string, string> = {
  twitter: "x",
  github: "github",
  gitlab: "gitlab",
  reddit: "reddit",
};

export default function AccountListPage({
  platform,
  heading,
  description,
  icon: Icon,
  emptyIcon,
  emptyText,
  addFirstLabel,
  addLabel,
  renderHeader,
  renderBadge,
  renderMeta,
  formatUsername,
}: AccountListPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 3 * 60_000,
  });

  const accounts = (data?.accounts || []).filter((a: Account) => a.platform === platform);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateAccount(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  const urlPrefix = PLATFORM_PREFIX[platform];
  const i18nKey = urlPrefix; // translation namespace for this platform (e.g., "x" not "twitter")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={24} />
          <div>
            <h2 className="text-xl font-semibold">{heading}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{typeof description === "function" ? description(accounts.length) : description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      {renderHeader?.()}

      <div>
        <h3 className="text-sm font-semibold mb-3">
          {accounts.length > 0 ? t(`${i18nKey}.configuredAccounts`) : t(`${i18nKey}.noAccounts`)}
        </h3>
        {accounts.length > 0 ? (
          <div className="space-y-3">
            {accounts.map((account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              // eslint-disable-next-line react-hooks/purity
              const isStale = lastFetched && (Date.now() - lastFetched.getTime()) > (account.fetch_interval || 30) * 60 * 1000;

              return (
                <Card
                  key={account.id}
                  className={
                    "group " +
                    (!account.is_active ? "opacity-60 " : "") +
                    "cursor-pointer hover:border-[var(--primary)]/50 transition-colors"
                  }
                  onClick={() => navigate(`/${urlPrefix}/${account.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">
                            {formatUsername ? formatUsername(account) : account.screen_name}
                          </span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          {renderBadge?.(account)}
                          {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
                          {account.error_message && (
                            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              {t("badge.error")}
                            </Badge>
                          )}
                          {isStale && account.is_active ? (
                            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                              {t("badge.stale")}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>{t(`${i18nKey}.accountCard.interval`, { minutes: account.fetch_interval })}</span>
                          {lastFetched && (
                            <span>{t(`${i18nKey}.accountCard.last`, { date: formatDateTime(lastFetched) })}</span>
                          )}
                          {renderMeta?.(account)}
                        </div>
                        {account.error_message && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                            <AlertCircle size={12} /> {account.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditAccount(account);
                          }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                          title={t(`${i18nKey}.accountCard.edit`)}
                          aria-label={t(`${i18nKey}.accountCard.edit`)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActiveMutation.mutate({ id: account.id, isActive: !account.is_active });
                          }}
                          disabled={toggleActiveMutation.isPending}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                          title={t(`${i18nKey}.accountCard.fetchNow`)}
                          aria-label={t(`${i18nKey}.accountCard.fetchNow`)}
                        >
                          {account.is_active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(account.id);
                          }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
                          title={t(`${i18nKey}.accountCard.delete`)}
                          aria-label={t(`${i18nKey}.accountCard.delete`)}
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
                {emptyIcon ?? <Icon size={32} />}
                <p className="text-sm text-[var(--muted-foreground)]">{emptyText}</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> {addFirstLabel}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} defaultPlatform={platform} />}
      {editAccount && <EditAccountForm account={editAccount} onClose={() => setEditAccount(null)} />}
    </div>
  );
}
