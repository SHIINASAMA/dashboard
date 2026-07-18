"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type Account } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon, GitlabIcon, RedditIcon, XIcon } from "@/components/BrandIcons";
import { formatDateTime } from "@/lib/client/datetime";
import { useNow } from "@/lib/client/use-now";
import { Pencil, Plus, PlayCircle, PauseCircle, Trash2, AlertCircle, ArrowUpRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const TABS = [
  { key: "twitter", headingKey: "nav.x", basePath: "/x", Icon: XIcon, formatUsername: (a: Account) => `@${a.screen_name}` },
  { key: "github", headingKey: "nav.github", basePath: "/github", Icon: GithubIcon, formatUsername: (a: Account) => a.screen_name },
  { key: "gitlab", headingKey: "nav.gitlab", basePath: "/gitlab", Icon: GitlabIcon, formatUsername: (a: Account) => a.screen_name },
  { key: "reddit", headingKey: "nav.reddit", basePath: "/reddit", Icon: RedditIcon, formatUsername: (a: Account) => a.screen_name },
] as const;

type Platform = (typeof TABS)[number]["key"];

export default function AccountsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Platform>("twitter");
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 3 * 60_000,
  });

  const accounts = (data?.accounts ?? []).filter((a: Account) => a.platform === tab);
  const now = useNow();

  const staleMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const a of accounts) {
      const last = a.last_fetched_at ? new Date(a.last_fetched_at).getTime() : 0;
      map.set(a.id, last > 0 && (now - last) > (a.fetch_interval || 30) * 60 * 1000);
    }
    return map;
  }, [accounts, now]);

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

  const currentTab = TABS.find((t) => t.key === tab)!;
  const showForm = adding || editing;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("settings.accounts")}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{t("settings.accountsDesc")}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setAdding(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> {t("settings.addAccount")}
        </button>
      </div>

      {/* platform tabs */}
      <div className="mobile-tab-strip -mx-4 flex snap-x gap-1 overflow-x-auto border-b border-[var(--border)] px-4">
        {TABS.map(({ key, headingKey, Icon }) => (
          <button key={key} onClick={() => { setTab(key); setAdding(false); setEditing(null); }}
            className={`-mb-px flex min-h-11 shrink-0 snap-start items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === key ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            <Icon size={14} /> {t(headingKey)}
          </button>
        ))}
      </div>

      {/* inline form — uses key to force remount when editing target changes */}
      {showForm && (
        <Card>
          <CardContent className="p-5">
            <AccountFormPanel
              key={editing ? editing.id : "add"}
              account={editing}
              defaultPlatform={editing?.platform as Platform ?? tab}
              onClose={() => { setEditing(null); setAdding(false); }}
            />
          </CardContent>
        </Card>
      )}

      {/* account list — full width */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {accounts.length > 0 ? `${accounts.length} accounts` : t("settings.noAccounts")}
        </h3>
        {accounts.length > 0 ? (
          <div className="space-y-3">
            {accounts.map((account: Account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              const isStale = staleMap.get(account.id) ?? false;

              return (
                <Card key={account.id}
                  className={`group ${!account.is_active ? "opacity-60 " : ""}cursor-pointer hover:border-[var(--primary)]/50 transition-colors`}
                  onClick={() => router.push(`${currentTab.basePath}/${account.id}`)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="mobile-account-card justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                          <span className="min-w-0 break-all text-base font-semibold">{currentTab.formatUsername(account)}</span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] hover-reveal-icon" />
                          {!account.is_active && <Badge>{t("badge.inactive")}</Badge>}
                          {account.error_message && (
                            <Badge className="bg-[var(--danger)]/10 text-[var(--danger)]">{t("badge.error")}</Badge>
                          )}
                          {isStale && account.is_active && (
                            <Badge className="bg-[var(--warn)]/10 text-[var(--warn)]">{t("badge.stale")}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>{t("settings.interval", { minutes: account.fetch_interval })}</span>
                          {lastFetched && <span>{t("settings.lastFetched", { date: formatDateTime(lastFetched) })}</span>}
                        </div>
                        {account.error_message && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--danger)]">
                            <AlertCircle size={12} /> {account.error_message}
                          </div>
                        )}
                      </div>
                      <div className="mobile-account-actions shrink-0 items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(account); setAdding(false); }}
                          className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                          title={t("settings.edit")}
                        ><Pencil size={16} /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActiveMutation.mutate({ id: account.id, isActive: !account.is_active }); }}
                          disabled={toggleActiveMutation.isPending}
                          className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                          title={account.is_active ? t("settings.disable") : t("settings.enable")}
                        >{account.is_active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(account); }}
                          disabled={deleteMutation.isPending}
                          className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-[var(--muted)] hover:bg-[var(--danger)]/10 text-[var(--danger)] transition-colors"
                          title={t("settings.delete")}
                        ><Trash2 size={16} /></button>
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
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("settings.noAccountsDesc")}</p>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={14} /> {t("settings.addFirstAccount")}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("settings.delete")}
        description={t("settings.deleteConfirm", { name: deleteTarget?.screen_name ?? "" })}
        onConfirm={async () => { deleteMutation.mutate(deleteTarget!.id); }}
      />
    </div>
  );
}

// ── Inline form ──────────────────────────────────────────────────

function AccountFormPanel({
  account, defaultPlatform, onClose,
}: {
  account: Account | null;
  defaultPlatform: Platform;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const editing = !!account;

  const [screenName, setScreenName] = useState(account?.screen_name ?? "");
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(account?.fetch_interval ?? 30);
  const [platform, setPlatform] = useState<Platform>(account?.platform as Platform ?? defaultPlatform);
  const [instanceUrl, setInstanceUrl] = useState(account?.instance_url ?? "");
  const [authType, setAuthType] = useState<string | null>(account?.auth_type ?? null);
  const [error, setError] = useState("");

  const isReddit = platform === "reddit";
  const isRedditPublic = isReddit && authType === "reddit_public";

  // Load reddit cookie details on edit — the list API no longer returns auth_token
  const [cookieLoading, setCookieLoading] = useState(false);
  const cookieInitDone = useRef(false);

  // cookie table state
  const [cookieEntries, setCookieEntries] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (!editing || !isReddit || !isRedditPublic || !account || cookieInitDone.current) return;
    setCookieLoading(true);
    api.getAccount(account.id).then(detail => {
      cookieInitDone.current = true;
      if (detail?.auth_token) {
        try {
          const obj = JSON.parse(detail.auth_token);
          const entries = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }));
          setCookieEntries(entries);
          setAuthToken(JSON.stringify(obj));
        } catch { /* ignore */ }
      }
      setCookieLoading(false);
    }).catch(() => setCookieLoading(false));
  }, [editing, isReddit, isRedditPublic, account]);

  const syncCookieToken = (entries: { key: string; value: string }[]) => {
    setCookieEntries(entries);
    const obj: Record<string, string> = {};
    for (const { key, value } of entries) { if (key.trim()) obj[key.trim()] = value; }
    setAuthToken(JSON.stringify(obj));
  };

  const addMutation = useMutation({
    mutationFn: () => api.createAccount({ screenName, authToken, fetchInterval, platform, instanceUrl: instanceUrl || undefined, authType: authType || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      const d: Record<string, string | number | boolean | null> = {};
      if (screenName !== account!.screen_name) d.screenName = screenName;
      if (authToken !== "") d.authToken = authToken;
      if (fetchInterval !== account!.fetch_interval) d.fetchInterval = fetchInterval;
      if (isReddit && authType !== (account!.auth_type || null)) d.authType = authType || null;
      if (platform === "gitlab" && instanceUrl !== (account!.instance_url || "")) d.instanceUrl = instanceUrl || null;
      return api.updateAccount(account!.id, d);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const mutation = editing ? editMutation : addMutation;
  const canSubmit = !mutation.isPending && !!screenName && (editing || !!authToken);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{editing ? t("editAccountForm.title") : t("addAccountForm.title")}</h3>
        <button onClick={onClose} className="min-h-11 rounded-md px-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
          {t("addAccountForm.cancel")}
        </button>
      </div>
      {error && <div className="p-3 rounded-lg bg-[var(--danger)]/5 text-[var(--danger)] text-sm">{error}</div>}

      {/* platform selector — add mode only */}
      {!editing && (
        <div className="grid grid-cols-4 gap-2">
          {TABS.map(({ key, Icon }) => (
            <button key={key} type="button" onClick={() => setPlatform(key)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${platform === key ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
            >
              <Icon size={16} /> {t(`nav.${key === "twitter" ? "x" : key}`)}
            </button>
          ))}
        </div>
      )}

      {/* ── fields ── */}
      <div className="space-y-4">

        {/* username */}
        <fieldset>
          <legend className="text-sm font-medium mb-1.5">{t("addAccountForm.username")}</legend>
          <input type="text" value={screenName} onChange={(e) => setScreenName(e.target.value)}
            placeholder={platform === "github" ? "octocat" : platform === "gitlab" ? "your-username" : platform === "reddit" ? "spez" : "elonmusk"}
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
          <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
            {platform === "github" ? t("addAccountForm.helpGithubUsername")
              : platform === "gitlab" ? t("addAccountForm.helpGitlabUsername")
              : platform === "reddit" ? t("addAccountForm.helpRedditUsername")
              : t("addAccountForm.helpXUsername")}
          </p>
        </fieldset>

        {/* reddit auth type */}
        {isReddit && (
          <fieldset>
            <legend className="text-sm font-medium mb-1.5">{t("addAccountForm.redditAuthType")}</legend>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAuthType(null)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${authType !== "reddit_public" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
              >{t("addAccountForm.redditOAuth")}</button>
              <button type="button" onClick={() => setAuthType("reddit_public")}
                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${authType === "reddit_public" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
              >{t("addAccountForm.redditPublic")}</button>
            </div>
            <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
              {isRedditPublic ? t("addAccountForm.helpRedditPublicMode") : t("addAccountForm.helpRedditOAuthMode")}
            </p>
          </fieldset>
        )}

        {/* token — single input or cookie table */}
        <fieldset>
          <legend className="text-sm font-medium mb-1.5">
            {isRedditPublic ? t("addAccountForm.cookies") :
              platform === "github" || platform === "gitlab" ? t("addAccountForm.personalAccessToken") :
              platform === "reddit" ? t("addAccountForm.refreshToken") :
              t("addAccountForm.authToken")}
          </legend>

          {isRedditPublic ? (
            cookieLoading ? <p className="text-sm text-[var(--muted-foreground)]">Loading...</p> :
            <CookieTable entries={cookieEntries} onChange={syncCookieToken} t={t} />
          ) : (
            <div>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder={platform === "github" ? "ghp_..." : platform === "gitlab" ? "glpat-..." : platform === "reddit" ? "your Reddit password" : "Your X auth_token cookie"}
                className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
                {editing ? t("editAccountForm.tokenHint") : (
                  platform === "github" ? t("addAccountForm.helpGithubToken")
                    : platform === "gitlab" ? t("addAccountForm.helpGitlabToken")
                    : platform === "reddit" ? t("addAccountForm.helpRedditToken")
                    : t("addAccountForm.helpXToken")
                )}
              </p>
            </div>
          )}
        </fieldset>

        {/* gitlab instance URL */}
        {platform === "gitlab" && (
          <fieldset>
            <legend className="text-sm font-medium mb-1.5">{t("addAccountForm.instanceUrl")}</legend>
            <input type="text" value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="https://gitlab.com"
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
            <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{t("addAccountForm.helpInstanceUrl")}</p>
          </fieldset>
        )}

        {/* fetch interval */}
        <fieldset>
          <legend className="text-sm font-medium mb-1.5">{t("addAccountForm.fetchInterval")}</legend>
          <input type="number" value={fetchInterval} onChange={(e) => setFetchInterval(Number(e.target.value))} min={5} max={1440}
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
          <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{t("addAccountForm.helpFetchInterval")}</p>
        </fieldset>
      </div>

      <button onClick={() => mutation.mutate()} disabled={!canSubmit}
        className="min-h-11 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
        {mutation.isPending ? (editing ? t("editAccountForm.saving") : t("addAccountForm.adding")) : (editing ? t("editAccountForm.save") : t("addAccountForm.addAccount"))}
      </button>
    </div>
  );
}

// ── Cookie key-value table ───────────────────────────────────────

function CookieTable({
  entries, onChange, t,
}: {
  entries: { key: string; value: string }[];
  onChange: (entries: { key: string; value: string }[]) => void;
  t: (key: string) => string;
}) {
  const addRow = () => onChange([...entries, { key: "", value: "" }]);
  const removeRow = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: "key" | "value", val: string) => {
    const next = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-[var(--muted-foreground)]">{t("addAccountForm.helpRedditPublicCookies")}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <th className="pb-1.5 font-medium w-1/3">{t("addAccountForm.cookieName")}</th>
            <th className="pb-1.5 font-medium">{t("addAccountForm.cookieValue")}</th>
            <th className="pb-1.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {entries.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]/50">
              <td className="py-1 pr-2">
                <input type="text" value={row.key} onChange={(e) => updateRow(i, "key", e.target.value)}
                  placeholder="cookie name"
                  className="min-h-11 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
              </td>
              <td className="py-1 pr-2">
                <input type="password" value={row.value} onChange={(e) => updateRow(i, "value", e.target.value)}
                  placeholder="..."
                  className="min-h-11 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
              </td>
              <td className="py-1">
                <button onClick={() => removeRow(i)} className="flex min-h-11 min-w-11 items-center justify-center rounded text-xs text-[var(--danger)]/60 transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow}
        className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
      >
        + {t("addAccountForm.addCookieRow")}
      </button>
    </div>
  );
}
