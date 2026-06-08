import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import type { Account } from "../api";

interface Props {
  account: Account;
  onClose: () => void;
}

export default function EditAccountForm({ account, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [screenName, setScreenName] = useState(account.screen_name);
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(account.fetch_interval);
  const [instanceUrl, setInstanceUrl] = useState(account.instance_url || "");
  const [authType, setAuthType] = useState<string | null>(account.auth_type || null);
  const [error, setError] = useState("");

  const isReddit = account.platform === "reddit";
  const isRedditPublic = isReddit && authType === "reddit_public";

  const mutation = useMutation({
    mutationFn: () => {
      const data: Record<string, any> = {};
      if (screenName !== account.screen_name) data.screenName = screenName;
      if (authToken) data.authToken = authToken;
      if (fetchInterval !== account.fetch_interval) data.fetchInterval = fetchInterval;
      if (account.platform === "gitlab" && instanceUrl !== (account.instance_url || "")) {
        data.instanceUrl = instanceUrl || null;
      }
      if (account.platform === "reddit" && authType !== (account.auth_type || null)) {
        data.authType = authType || null;
      }
      return api.updateAccount(account.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{t("editAccountForm.title")}</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.username")}</label>
            <input
              type="text" value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
            />
          </div>

          {isReddit && (
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.redditAuthType")}</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setAuthType(null)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${authType !== "reddit_public" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
                >
                  {t("addAccountForm.redditOAuth")}
                </button>
                <button type="button" onClick={() => setAuthType("reddit_public")}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${authType === "reddit_public" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
                >
                  {t("addAccountForm.redditPublic")}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">
              {account.platform === "github" ? t("addAccountForm.personalAccessToken")
                : account.platform === "gitlab" ? t("addAccountForm.personalAccessToken")
                : account.platform === "reddit" ? (isRedditPublic ? t("addAccountForm.loidCookie") : t("addAccountForm.refreshToken"))
                : t("addAccountForm.authToken")}
            </label>
            <input
              type="password" value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={account.platform === "github" ? t("addAccountForm.placeholderGithubToken")
                : account.platform === "gitlab" ? t("addAccountForm.placeholderGitlabToken")
                : account.platform === "reddit" ? (isRedditPublic ? t("addAccountForm.placeholderRedditToken") : t("addAccountForm.placeholderRedditOAuthToken"))
                : t("addAccountForm.placeholderXToken")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-xs"
            />
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              {t("editAccountForm.tokenHint")}
            </p>
          </div>

          {account.platform === "gitlab" && (
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.instanceUrl")}</label>
              <input
                type="text" value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder={t("addAccountForm.placeholderInstanceUrl")}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.fetchInterval")}</label>
            <input
              type="number" value={fetchInterval}
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              min={5} max={1440}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !screenName}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 text-sm"
          >
            {mutation.isPending ? t("editAccountForm.saving") : t("editAccountForm.save")}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
            {t("addAccountForm.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
