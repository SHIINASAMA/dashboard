import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GithubIcon, GitlabIcon, RedditIcon, XIcon } from "./BrandIcons";
import { api } from "../api";

interface Props {
  onClose: () => void;
  defaultPlatform?: "twitter" | "github" | "gitlab" | "reddit";
}

const PLATFORMS = [
  { key: "twitter", labelKey: "addAccountForm.xTwitter", Icon: XIcon },
  { key: "github", labelKey: "addAccountForm.github", Icon: GithubIcon },
  { key: "gitlab", labelKey: "addAccountForm.gitlab", Icon: GitlabIcon },
  { key: "reddit", labelKey: "addAccountForm.reddit", Icon: RedditIcon },
] as const;

export default function AddAccountForm({ onClose, defaultPlatform = "twitter" }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [screenName, setScreenName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(30);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [authType, setAuthType] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isRedditPublic = platform === "reddit" && authType === "reddit_public";

  const mutation = useMutation({
    mutationFn: () => api.createAccount({
      screenName,
      authToken,
      fetchInterval,
      platform,
      instanceUrl: instanceUrl || undefined,
      authType: authType || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-lg mx-4 shadow-lg border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{t("addAccountForm.title")}</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex flex-col gap-4">
          {/* ── platform selector ── */}
          <div className="grid grid-cols-4 gap-1.5">
            {PLATFORMS.map(({ key, labelKey, Icon }) => (
              <button key={key} type="button" onClick={() => setPlatform(key)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${platform === key ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
              >
                <Icon size={14} /> {t(labelKey)}
              </button>
            ))}
          </div>

          {/* ── two-column body ── */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* left column: common fields */}
            <div className="sm:col-span-2 flex flex-col gap-3">
              <div>
                <label htmlFor="add-account-username" className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.username")}</label>
                <input
                  id="add-account-username"
                  type="text" value={screenName}
                  onChange={(e) => setScreenName((e.target as HTMLInputElement).value)}
                  placeholder={platform === "github" ? t("addAccountForm.placeholderGithubUsername") : platform === "gitlab" ? t("addAccountForm.placeholderGitlabUsername") : platform === "reddit" ? t("addAccountForm.placeholderRedditUsername") : t("addAccountForm.placeholderXUsername")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
                />
              </div>

              {platform === "reddit" && (
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
                <label htmlFor="add-account-token" className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">
                  {platform === "github" ? t("addAccountForm.personalAccessToken") : platform === "gitlab" ? t("addAccountForm.personalAccessToken") : platform === "reddit" ? (isRedditPublic ? t("addAccountForm.loidCookie") : t("addAccountForm.refreshToken")) : t("addAccountForm.authToken")}
                </label>
                <input
                  id="add-account-token"
                  type="password" value={authToken}
                  onChange={(e) => setAuthToken((e.target as HTMLInputElement).value)}
                  placeholder={platform === "github" ? t("addAccountForm.placeholderGithubToken") : platform === "gitlab" ? t("addAccountForm.placeholderGitlabToken") : platform === "reddit" ? (isRedditPublic ? t("addAccountForm.placeholderRedditToken") : t("addAccountForm.placeholderRedditOAuthToken")) : t("addAccountForm.placeholderXToken")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-xs"
                />
                <p className="text-[11px] text-[var(--muted-foreground)] mt-1 leading-snug">
                  {platform === "github" ? t("addAccountForm.helpGithub")
                    : platform === "gitlab" ? t("addAccountForm.helpGitlab")
                    : platform === "reddit" ? (isRedditPublic ? t("addAccountForm.helpRedditPublic") : t("addAccountForm.helpReddit"))
                    : t("addAccountForm.helpX")}
                </p>
              </div>

              {platform === "gitlab" && (
                <div>
                  <label htmlFor="add-account-instance-url" className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.instanceUrl")}</label>
                  <input
                    id="add-account-instance-url"
                    type="text" value={instanceUrl}
                    onChange={(e) => setInstanceUrl((e.target as HTMLInputElement).value)}
                    placeholder={t("addAccountForm.placeholderInstanceUrl")}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
                  />
                </div>
              )}

              <div>
                <label htmlFor="add-account-interval" className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("addAccountForm.fetchInterval")}</label>
                <input
                  id="add-account-interval"
                  type="number" value={fetchInterval}
                  onChange={(e) => setFetchInterval(Number((e.target as HTMLInputElement).value))}
                  min={5} max={1440}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
                />
              </div>
            </div>

            {/* right column: platform-specific guide */}
            <div className="sm:col-span-3">
              {platform === "github" && (
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs space-y-2">
                  <p className="font-medium">{t("addAccountForm.githubGuide.title")}</p>
                  <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                    <li><a href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Dashboard" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{t("addAccountForm.howToCreateToken")}</a></li>
                    <li>{t("addAccountForm.githubGuide.step2")}</li>
                    <li>{t("addAccountForm.githubGuide.step3")}</li>
                  </ol>
                </div>
              )}
              {platform === "gitlab" && (
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs space-y-2">
                  <p className="font-medium">{t("addAccountForm.gitlabGuide.title")}</p>
                  <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                    <li><a href={`${instanceUrl || "https://gitlab.com"}/-/user_settings/personal_access_tokens?name=Dashboard&scopes=read_api,read_user,read_repository`} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{t("addAccountForm.howToCreateGitlabToken")}</a></li>
                    <li>{t("addAccountForm.gitlabGuide.step2")}</li>
                    <li>{t("addAccountForm.gitlabGuide.step3")}</li>
                    <li>{t("addAccountForm.gitlabGuide.step4")}</li>
                  </ol>
                </div>
              )}
              {platform === "reddit" && (
                isRedditPublic ? (
                  <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs space-y-2">
                    <p className="font-medium">{t("addAccountForm.redditPublicGuide.title")}</p>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                      <li>{t("addAccountForm.redditPublicGuide.step1")}</li>
                      <li>{t("addAccountForm.redditPublicGuide.step2")}</li>
                      <li>{t("addAccountForm.redditPublicGuide.step3")}</li>
                      <li>{t("addAccountForm.redditPublicGuide.step4")}</li>
                    </ol>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs space-y-2">
                    <p className="font-medium">{t("addAccountForm.redditGuide.title")}</p>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                      <li>{t("addAccountForm.redditGuide.step1")} <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{t("addAccountForm.howToCreateRedditApp")}</a></li>
                      <li>{t("addAccountForm.redditGuide.step2")}</li>
                      <li>{t("addAccountForm.redditGuide.step3").replace("{url}", `${window.location.protocol}//${window.location.host}/api/reddit/callback`)}</li>
                      <li>{t("addAccountForm.redditGuide.step4")}</li>
                      <li>{t("addAccountForm.redditGuide.step5")}</li>
                    </ol>
                    <p className="text-[var(--muted-foreground)]">{t("addAccountForm.redditGuide.fields")}</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[var(--muted-foreground)]">
                      <li>{t("addAccountForm.redditGuide.fieldUsername")}</li>
                      <li>{t("addAccountForm.redditGuide.fieldToken")}</li>
                    </ul>
                  </div>
                )
              )}
              {platform === "twitter" && (
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs space-y-2">
                  <p className="font-medium">{t("addAccountForm.xGuide.title")}</p>
                  <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                    <li>{t("addAccountForm.xGuide.step1")}</li>
                    <li>{t("addAccountForm.xGuide.step2")}</li>
                    <li>{t("addAccountForm.xGuide.step3")}</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* ── actions ── */}
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !screenName || !authToken}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 text-sm"
            >
              {mutation.isPending ? t("addAccountForm.adding") : t("addAccountForm.addAccount")}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm">
              {t("addAccountForm.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
