import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "lucide-react";
import { api } from "@/lib/api";

// Toggles whether an account is active (fetching enabled). Uses an explicit
// pause/play icon + label instead of the old ambiguous RefreshCw glyph.
export function AccountActiveButton({ accountId, isActive }: { accountId: number; isActive: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => api.updateAccount(accountId, { isActive: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", accountId] }),
  });
  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-xs disabled:opacity-40"
      title={isActive ? t("accountActive.pause") : t("accountActive.resume")}
      aria-label={isActive ? t("accountActive.pause") : t("accountActive.resume")}
    >
      {isActive ? <Pause size={14} /> : <Play size={14} />}
      <span>{isActive ? t("accountActive.pause") : t("accountActive.resume")}</span>
    </button>
  );
}
