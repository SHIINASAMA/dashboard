import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { SectionShell } from "@/components/domain/shared/SectionShell";
import type { TopContentItem } from "@/shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { BaseCard } from "@/components/ui/BaseCard";
import { TableCard } from "@/components/domain/shared/OverviewCards";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { ChartCardSkeleton } from "@/components/Skeleton";
import { GithubIcon, GitlabIcon, RedditIcon, XIcon } from "@/components/BrandIcons";

const TIME_OPTIONS = [
  { value: 7, labelKey: "timeRange.7d" },
  { value: 30, labelKey: "timeRange.30d" },
  { value: 90, labelKey: "timeRange.90d" },
];

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "twitter") return <XIcon />;
  if (platform === "github") return <GithubIcon />;
  if (platform === "gitlab") return <GitlabIcon />;
  return <RedditIcon />;
}

export function TopContentSection() {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["top-content", days],
    queryFn: () => api.getTopContent(days),
    refetchInterval: 3 * 60_000,
  });

  const items = data?.items ?? [];

  return (
    <SectionShell icon={<BarChart3 size={16} />} title={t("overview.topContent.heading")} action={<TimeRangeSelector value={days} onChange={setDays} options={TIME_OPTIONS} />}>

      {isLoading ? (
        <ChartCardSkeleton />
      ) : isError || !data ? (
        <BaseCard variant="default">
          <p className="text-sm text-[var(--muted-foreground)]">{t("overview.topContent.unavailable")}</p>
        </BaseCard>
      ) : items.length === 0 ? (
        <BaseCard variant="default">
          <p className="text-sm text-[var(--muted-foreground)]">{t("overview.topContent.noData")}</p>
        </BaseCard>
      ) : (
        <TableCard>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-2.5 font-medium w-full">{t("overview.topContent.colContent")}</th>
                  <th className="whitespace-nowrap px-2 py-2.5 font-medium">{t("overview.topContent.colPlatform")}</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-right font-medium">{t("overview.topContent.colMetric")}</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{t("overview.topContent.colGrowth")}</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 15).map((item) => (
                  <TopContentRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
        </TableCard>
      )}
    </SectionShell>
  );
}

function TopContentRow({ item }: { item: TopContentItem }) {
  const { t } = useTranslation();
  const metricLabel = t(`overview.topContent.metric.${item.metricLabel}`);
  const secondaryLabel = item.secondaryLabel
    ? t(`overview.topContent.metric.${item.secondaryLabel}`)
    : null;

  return (
    <tr className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--muted)] active:bg-[var(--border)]/50">
      <td className="px-4 py-2.5" style={{ width: "100%" }}>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0"><PlatformIcon platform={item.platform} /></span>
          <div className="min-w-0 flex-1">
            {item.route ? (
              <Link to={item.route} className="block line-clamp-1 text-sm leading-5 hover:underline">{item.title}</Link>
            ) : (
              <p className="line-clamp-1 text-sm leading-5">{item.title}</p>
            )}
            <p className="truncate text-[11px] leading-4 text-[var(--muted-foreground)]">
              {item.subtitle ?? `@${item.accountName}`}
              {secondaryLabel && item.secondaryValue !== null
                ? <> · {secondaryLabel}: {item.secondaryValue.toLocaleString()}</>
                : null}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-[11px] text-[var(--muted-foreground)]">
        {t(`nav.${item.platform === "twitter" ? "x" : item.platform}`)}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
        <span className="text-sm font-semibold">{item.metricValue.toLocaleString()}</span>
        {" "}
        <span className="text-[11px] text-[var(--muted-foreground)]">{metricLabel}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
        {item.growthRate !== null ? (
          <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
            item.growthRate > 0
              ? "text-[var(--success)]"
              : item.growthRate < 0
                ? "text-[var(--danger)]"
                : "text-[var(--muted-foreground)]"
          }`}>
            {item.growthRate > 0 && <TrendingUp size={12} />}
            {item.growthRate > 0 ? "+" : ""}{item.growthRate}%
          </span>
        ) : (
          <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
        )}
      </td>
    </tr>
  );
}
