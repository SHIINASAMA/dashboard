import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { CompactCard } from "@/components/domain/shared/OverviewCards";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Skeleton";
import { getPlatformLabelKey } from "@/lib/platforms";

export function FetchHealthSection() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["fetch-health"],
    queryFn: api.getFetchHealth,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
          <CheckCircle2 size={16} /> {t("overview.health.heading")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6 text-sm text-[var(--muted-foreground)]">
          {t("overview.health.unavailable")}
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      icon: <CheckCircle2 size={16} />,
      title: t("overview.health.healthy"),
      value: data.summary.healthy.toLocaleString(),
      description: t("overview.health.activeCount", { count: data.summary.activeAccounts }),
    },
    {
      icon: <Clock size={16} />,
      title: t("overview.health.stale"),
      value: data.summary.stale.toLocaleString(),
      description: t("overview.health.beyondInterval"),
    },
    {
      icon: <AlertTriangle size={16} />,
      title: t("overview.health.failed"),
      value: (data.summary.failed + data.summary.partial).toLocaleString(),
      description: t("overview.health.failedHint"),
    },
    {
      icon: <KeyRound size={16} />,
      title: t("overview.health.capabilityGap"),
      value: data.summary.capabilityGap.toLocaleString(),
      description: t("overview.health.capabilityHint"),
    },
  ];

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
        <CheckCircle2 size={16} /> {t("overview.health.heading")}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => <StatCard key={card.title} {...card} />)}
      </div>

      {data.unsupportedAccounts.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--warn)]/5 text-[var(--warn)] text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="min-w-0">
            {t("overview.health.unsupportedAccounts", {
              count: data.unsupportedAccounts.length,
              platforms: data.unsupportedAccounts.map((account) => account.platform).join(" / "),
            })}
          </p>
        </div>
      )}

      {data.issues.length > 0 && (
        <CompactCard>
            <div className="space-y-0.5 -mx-2">
              {data.issues.slice(0, 5).map((issue) => (
                <div key={issue.accountId} className="rounded-md p-2 transition-colors hover:bg-[var(--muted)] active:bg-[var(--border)]/50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-h-5 min-w-0 truncate text-sm leading-5 font-medium">
                      {issue.screenName}
                      {getPlatformLabelKey(issue.platform) && (
                        <span className="ml-2 inline-flex items-center rounded bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                          {t(getPlatformLabelKey(issue.platform)!)}
                        </span>
                      )}
                    </p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${issue.status === "failed" ? "bg-[var(--danger)]/10 text-[var(--danger)]" : issue.status === "capability_gap" || issue.status === "partial" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {t(`overview.health.status.${issue.status}`)}
                    </span>
                  </div>
                  {(issue.latestError || issue.capabilityGaps[0]?.message) && (
                    <p className="mt-1 truncate text-[11px] leading-4 text-[var(--muted-foreground)]">
                      {issue.capabilityGaps[0]?.message || issue.latestError}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {data.issues.length > 5 && (
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                {t("overview.health.moreIssues", { count: data.issues.length - 5 })}
              </p>
            )}
        </CompactCard>
      )}
    </section>
  );
}
