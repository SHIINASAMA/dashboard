import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Activity, ArrowUpRight, GitFork, Layers, MessageSquare,
  Star, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PulseContentItem } from "@/shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatCompactCard, HighlightCard } from "@/components/domain/shared/OverviewCards";
import { BaseCard } from "@/components/ui/BaseCard";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { ChartCardSkeleton, StatCardSkeleton } from "@/components/Skeleton";
import { GithubIcon, GitlabIcon, RedditIcon, XIcon } from "@/components/BrandIcons";

const TIME_OPTIONS = [
  { value: 7, labelKey: "timeRange.7d" },
  { value: 30, labelKey: "timeRange.30d" },
  { value: 90, labelKey: "timeRange.90d" },
];

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function deltaDescription(current: number, previous: number) {
  return `${previous.toLocaleString()} → ${current.toLocaleString()}`;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "twitter") return <XIcon />;
  if (platform === "github") return <GithubIcon />;
  if (platform === "gitlab") return <GitlabIcon />;
  return <RedditIcon />;
}

function ContentRow({ item, labels }: { item: PulseContentItem; labels: { metric: string; secondary?: string } }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-md p-2 transition-colors hover:bg-[var(--muted)] active:bg-[var(--border)]/50">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 min-h-10 min-w-0 text-sm leading-5">{item.title}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{item.metricValue.toLocaleString()}</span>
      </div>
      <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-[11px] leading-4 text-[var(--muted-foreground)]">
        <span className="min-w-0 truncate">{item.subtitle || `@${item.accountName}`}</span>
        <span className="shrink-0 whitespace-nowrap">
          {labels.metric}
          {labels.secondary && <> · {labels.secondary}: {item.secondaryValue.toLocaleString()}</>}
        </span>
      </div>
    </a>
  );
}

export function PulseSection() {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pulse", days],
    queryFn: () => api.getPulse(days),
    refetchInterval: 3 * 60_000,
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
          <Activity size={16} /> {t("overview.pulse.heading")}
        </h3>
        <TimeRangeSelector value={days} onChange={setDays} options={TIME_OPTIONS} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}
          </div>
          <ChartCardSkeleton />
        </div>
      ) : isError || !data ? (
        <BaseCard variant="default"><p className="text-sm text-[var(--muted-foreground)]">{t("overview.pulse.unavailable")}</p></BaseCard>
      ) : data.platforms.length === 0 ? (
        <BaseCard variant="default"><p className="text-sm text-[var(--muted-foreground)]">{t("overview.pulse.noData")}</p></BaseCard>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCompactCard
              icon={<Layers size={16} />}
              title={t("overview.pulse.activePlatforms")}
              value={data.platforms.length.toLocaleString()}
              description={t("overview.pulse.rangeDays", { count: data.range.days })}
            />
            <StatCompactCard
              icon={<Activity size={16} />}
              title={t("overview.pulse.activity")}
              value={signed(data.totals.activity.change)}
              description={deltaDescription(data.totals.activity.previous, data.totals.activity.current)}
            />
            <StatCompactCard
              icon={<Star size={16} />}
              title={t("overview.pulse.stars")}
              value={signed(data.totals.traction.stars.change)}
              description={deltaDescription(data.totals.traction.stars.previous, data.totals.traction.stars.current)}
            />
            <StatCompactCard
              icon={<GitFork size={16} />}
              title={t("overview.pulse.forks")}
              value={signed(data.totals.traction.forks.change)}
              description={deltaDescription(data.totals.traction.forks.previous, data.totals.traction.forks.current)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {data.platforms.map((platform) => (
              <BaseCard key={platform.platform} variant="compact" contentClassName="flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                      <PlatformIcon platform={platform.platform} />
                      <span className="truncate">{t(`nav.${platform.platform === "twitter" ? "x" : platform.platform}`)}</span>
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${
                      platform.audience.change > 0
                        ? "text-[var(--success)]"
                        : platform.audience.change < 0
                          ? "text-[var(--danger)]"
                          : "text-[var(--muted-foreground)]"
                    }`}>
                      {signed(platform.audience.change)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[11px] leading-4 text-[var(--muted-foreground)]">
                    {platform.audienceMetric === "karma"
                      ? t("overview.pulse.karma")
                      : t("overview.pulse.followers")}
                    {" · "}
                    {t("overview.pulse.activityShort", { count: platform.activity.current })}
                  </p>
                </BaseCard>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(
            (data.content.tweets.length > 0 ? 1 : 0) +
            (data.content.redditPosts.length > 0 || data.content.redditComments.length > 0 ? 1 : 0) +
            (data.repositories.length > 0 ? 1 : 0),
            3
          )}, minmax(0, 1fr))` }}>
            {data.content.tweets.length > 0 && (
              <HighlightCard title={t("overview.pulse.topTweets")} icon={<MessageSquare size={16} />}>
                {data.content.tweets.map((item) => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    labels={{
                      metric: t("overview.pulse.likes"),
                      secondary: t("overview.pulse.engagement"),
                    }}
                  />
                ))}
              </HighlightCard>
            )}

            {(data.content.redditPosts.length > 0 || data.content.redditComments.length > 0) && (
              <HighlightCard title={t("overview.pulse.topReddit")} icon={<TrendingUp size={16} />}>
                {[...data.content.redditPosts, ...data.content.redditComments].slice(0, 5).map((item) => (
                  <ContentRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    labels={{
                      metric: t("overview.pulse.score"),
                      secondary: item.kind === "reddit_post" ? t("overview.pulse.comments") : undefined,
                    }}
                  />
                ))}
              </HighlightCard>
            )}

            {data.repositories.length > 0 && (
              <HighlightCard title={t("overview.pulse.projectMovers")} icon={<Star size={16} />}>
                {data.repositories.map((item) => (
                  <Link key={item.id} to={item.route} className="block rounded-md p-2 transition-colors hover:bg-[var(--muted)] active:bg-[var(--border)]/50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 min-h-10 min-w-0 text-sm font-medium leading-5">{item.name}</p>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${item.starChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                        {signed(item.starChange)}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-[11px] leading-4 text-[var(--muted-foreground)]">
                      <span className="min-w-0 truncate">{item.fullName}</span>
                      <span className="shrink-0 whitespace-nowrap">{t("overview.stats.totalStars")}: {item.stars.toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </HighlightCard>
            )}
          </div>
        </>
      )}
    </section>
  );
}
