import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api";

interface Props {
  onClose: () => void;
  defaultPlatform?: "twitter" | "github";
}

export default function AddAccountForm({ onClose, defaultPlatform = "twitter" }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [screenName, setScreenName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(30);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.createAccount({ screenName, authToken, fetchInterval, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-md mx-4 shadow-lg border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{t("addAccountForm.title")}</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.platform")}</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPlatform("twitter")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${platform === "twitter" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}>
                {t("addAccountForm.xTwitter")}
              </button>
              <button type="button" onClick={() => setPlatform("github")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${platform === "github" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" className="inline mr-1"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg> {t("addAccountForm.github")}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.username")}</label>
            <input
              type="text" value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder={platform === "github" ? t("addAccountForm.placeholderGithubUsername") : t("addAccountForm.placeholderXUsername")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {platform === "github" ? t("addAccountForm.personalAccessToken") : t("addAccountForm.authToken")}
            </label>
            <input
              type="password" value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={platform === "github" ? t("addAccountForm.placeholderGithubToken") : t("addAccountForm.placeholderXToken")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-sm"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {platform === "github"
                ? t("addAccountForm.helpGithub")
                : t("addAccountForm.helpX")}
            </p>
            {platform === "github" && (
              <p className="text-xs mt-1.5">
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline">
                  {t("addAccountForm.howToCreateToken")}
                </a>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.fetchInterval")}</label>
            <input
              type="number" value={fetchInterval}
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              min={5} max={1440}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !screenName || (platform !== "github" && !authToken)}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {mutation.isPending ? t("addAccountForm.adding") : t("addAccountForm.addAccount")}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors">
              {t("addAccountForm.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
