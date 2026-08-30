import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { api } from "@/lib/api";
import { getPlatformFetchLevels } from "@/lib/application/scheduler/fetchPolicy";

// Which trigger levels a platform supports. Sourced from the shared
// fetchPolicy table so the UI can never offer a level the backend cannot run.
// "all" is a synthetic option meaning "run every supported level".
// Detail-page label namespace is derived from the platform so the button text
// localizes correctly on every platform, not just github.

const DETAIL_NAMESPACES: Record<string, string> = {
  github: "githubDetail",
  gitlab: "gitlabDetail",
  reddit: "redditDetail",
  twitter: "xDetail",
};

export function TriggerPanel({ accountId, platform = "github" }: { accountId: number; platform?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const levels = ["all", ...getPlatformFetchLevels(platform)];
  const [level, setLevel] = useState<string>("all");
  const ns = DETAIL_NAMESPACES[platform] ?? "githubDetail";

  const trigger = useMutation({
    mutationFn: () => api.triggerFetch(accountId, level),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    // stopPropagation so a trigger click doesn't bubble into a parent card's navigation
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="h-11 min-h-11 px-2.5 text-xs rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors border-0 outline-none cursor-pointer"
        aria-label={t("fetchLevel.select")}
      >
        {levels.map((l) => (
          <option key={l} value={l}>{t(`fetchLevel.${l}.label`)}</option>
        ))}
      </select>
      <button
        onClick={() => trigger.mutate()}
        disabled={trigger.isPending}
        className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs disabled:opacity-40"
      >
        <Play size={12} /> {trigger.isPending ? t(`${ns}.fetching`) : t(`${ns}.fetchNow`)}
      </button>
    </div>
  );
}
