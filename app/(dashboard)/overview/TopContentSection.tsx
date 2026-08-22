import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { TopContentItem } from "@/shared/types";
import { Card, CardContent } from "@/components/ui/card";
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
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
          <BarChart3 size={16} /> {t("overview.topContent.heading")}
        </h3>
        <TimeRangeSelector value={days} onChange={setDays} options={TIME_OPTIONS} />
      </div>

      {isLoading ? (
        <ChartCardSkeleton />
      ) : isError || !data ? (
        <Card>
          <CardContent className="p-5 pt-5 sm:p-5 sm:pt-5 text-sm text-[var(--muted-foreground)]">
            {t("overview.topContent.unavailable")}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-5 pt-5 sm:p-5 sm:pt-5 text-sm text-[var(--muted-foreground)]">
            {t("overview.topContent.noData")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 pt-0 sm:p-0 sm:pt-0 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-2.5 font-medium">{t("overview.topContent.colContent")}</th>
                  <th className="px-2 py-2.5 font-medium">{t("overview.topContent.colPlatform")}</th>
                  <th className="px-2 py-2.5 text-right font-medium">{t("overview.topContent.colMetric")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("overview.topContent.colGrowth")}</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 15).map((item) => (
                  <TopContentRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function TopContentRow({ item }: { item: TopContentItem }) {
  const { t } = useTranslation();
  const metricLabel = t(`overview.topContent.metric.${item.metricLabel}`);
  const secondaryLabel = item.secondaryLabel
    ? t(`overview.topContent.metric.${item.secondaryLabel}`)
    : null;

  return (
    <tr className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--muted)]">
      <td className="max-w-0 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0"><PlatformIcon platform={item.platform} /></span>
          <div className="min-w-0">
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
