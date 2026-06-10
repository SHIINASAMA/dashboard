import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { StatCard } from "../components/StatCard";
import AccountListPage from "../components/AccountListPage";
import { XIcon } from "../components/BrandIcons";
import { MessageSquare, Repeat2, Eye, TrendingUp } from "lucide-react";

export function X() {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 3 * 60_000,
  });

  const overview = data?.overview;

  return (
    <AccountListPage
      platform="twitter"
      heading={t("x.heading")}
      description={(count) =>
        count > 0 ? t("x.accounts_other", { count }) : t("x.description")
      }
      icon={XIcon}
      emptyText={t("x.emptyState")}
      addFirstLabel={t("x.addFirstAccount")}
      addLabel={t("x.addAccount")}
      formatUsername={(account) => `@${account.screen_name}`}
      renderHeader={() => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={t("overview.stats.tweetCount")} value={overview?.tweet_count ?? 0} icon={<MessageSquare size={20} />} description={overview ? t("overview.stats.today", { count: overview.todayTweets }) : t("overview.stats.dash")} />
          <StatCard title={t("overview.stats.tweetLikes")} value={(overview?.tweet_likes ?? 0).toLocaleString()} icon={<Heart size={20} />} />
          <StatCard title={t("overview.stats.tweetRetweets")} value={(overview?.tweet_retweets ?? 0).toLocaleString()} icon={<Repeat2 size={20} />} />
          <StatCard title={t("overview.stats.tweetViews")} value={(overview?.tweet_views ?? 0).toLocaleString()} icon={<Eye size={20} />} />
          <StatCard title={t("overview.stats.followers")} value={overview?.followersCount ?? 0} icon={<TrendingUp size={20} />} description={overview ? t("overview.stats.following", { count: overview.followingCount }) : t("overview.stats.dash")} />
        </div>
      )}
      renderMeta={(account) => account.stats ? (
        <>
          <span>{t("x.accountCard.followers", { count: account.stats.followers_count.toLocaleString() })}</span>
          <span>{t("x.accountCard.tweets", { count: account.stats.tweet_count.toLocaleString() })}</span>
        </>
      ) : null}
    />
  );
}
