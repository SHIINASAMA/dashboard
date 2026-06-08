import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api";

interface Props {
  onClose: () => void;
  defaultPlatform?: "twitter" | "github" | "gitlab" | "reddit";
}

export default function AddAccountForm({ onClose, defaultPlatform = "twitter" }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [screenName, setScreenName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(30);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.createAccount({
      screenName,
      authToken,
      fetchInterval,
      platform,
      instanceUrl: instanceUrl || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const needsToken = true; // All platforms require a token now

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
              <button type="button" onClick={() => setPlatform("gitlab")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${platform === "gitlab" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" className="inline mr-1"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" /></svg> {t("addAccountForm.gitlab")}
              </button>
              <button type="button" onClick={() => setPlatform("reddit")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${platform === "reddit" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" className="inline mr-1"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547.8-3.747c.104-.487.548-.83 1.051-.83.585 0 1.06.475 1.06 1.06a1.032 1.032 0 0 1-.86 1.022l-.206.034.244 2.538c.09-.004.183-.01.277-.01.264 0 .518.048.753.134zm-11.799.434c1.518 0 2.66.625 3.722 1.484 2.237-1.545 5.383-1.892 7.07-1.76l-1.1 5.08c.004.042.006.085.006.128 0 2.78-3.147 5.044-7.016 5.044-3.87 0-7.017-2.263-7.017-5.044 0-.043.002-.086.006-.128l-1.1-5.08c1.687-.132 4.833.215 7.07 1.76 1.062-.86 2.204-1.484 3.722-1.484h.637z" /></svg> {t("addAccountForm.reddit")}
              </button>
            </div>
          </div>

          {platform === "gitlab" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.instanceUrl")}</label>
              <input
                type="text" value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder={t("addAccountForm.placeholderInstanceUrl")}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("addAccountForm.helpInstanceUrl")}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.username")}</label>
            <input
              type="text" value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder={platform === "github" ? t("addAccountForm.placeholderGithubUsername") : platform === "gitlab" ? t("addAccountForm.placeholderGitlabUsername") : platform === "reddit" ? t("addAccountForm.placeholderRedditUsername") : t("addAccountForm.placeholderXUsername")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">
              {platform === "github" ? t("addAccountForm.personalAccessToken") : platform === "gitlab" ? t("addAccountForm.personalAccessToken") : platform === "reddit" ? t("addAccountForm.refreshToken") : t("addAccountForm.authToken")}
            </label>
            <input
              type="password" value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={platform === "github" ? t("addAccountForm.placeholderGithubToken") : platform === "gitlab" ? t("addAccountForm.placeholderGitlabToken") : platform === "reddit" ? t("addAccountForm.placeholderRedditToken") : t("addAccountForm.placeholderXToken")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-sm"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {platform === "github"
                ? t("addAccountForm.helpGithub")
                : platform === "gitlab"
                ? t("addAccountForm.helpGitlab")
                : platform === "reddit"
                ? t("addAccountForm.helpReddit")
                : t("addAccountForm.helpX")}
            </p>
            {platform === "github" && (
              <p className="text-xs mt-1.5">
                <a href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Dashboard" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline">
                  {t("addAccountForm.howToCreateToken")}
                </a>
              </p>
            )}
            {platform === "gitlab" && (
              <p className="text-xs mt-1.5">
                <a href={`${instanceUrl || "https://gitlab.com"}/-/user_settings/personal_access_tokens?name=Dashboard&scopes=read_api,read_user,read_repository`} target="_blank" rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline">
                  {t("addAccountForm.howToCreateGitlabToken")}
                </a>
              </p>
            )}
            {platform === "reddit" && (
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] space-y-2 text-xs">
                <p className="font-medium">{t("addAccountForm.redditGuide.title")}</p>
                <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                  <li>{t("addAccountForm.redditGuide.step1")} <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{t("addAccountForm.howToCreateRedditApp")}</a></li>
                  <li>{t("addAccountForm.redditGuide.step2")}</li>
                  <li>{t("addAccountForm.redditGuide.step3")}</li>
                  <li>{t("addAccountForm.redditGuide.step4")}</li>
                  <li>{t("addAccountForm.redditGuide.step5")}</li>
                </ol>
                <p className="text-[var(--muted-foreground)]">{t("addAccountForm.redditGuide.fields")}</p>
                <ul className="list-disc list-inside space-y-0.5 text-[var(--muted-foreground)]">
                  <li>{t("addAccountForm.redditGuide.fieldUsername")}</li>
                  <li>{t("addAccountForm.redditGuide.fieldToken")}</li>
                </ul>
              </div>
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
              disabled={mutation.isPending || !screenName || (needsToken && !authToken)}
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
