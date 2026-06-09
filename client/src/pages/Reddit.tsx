import { useTranslation } from "react-i18next";
import { type Account } from "../api";
import AccountListPage from "../components/AccountListPage";
import { RedditIcon } from "../components/BrandIcons";
import { Badge } from "../components/ui/badge";
import { MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";

export function Reddit() {
  const { t } = useTranslation();

  return (
    <AccountListPage
      platform="reddit"
      heading={t("reddit.heading")}
      description={(count) =>
        count > 0 ? t("reddit.accounts_other", { count }) : t("reddit.description")
      }
      icon={RedditIcon}
      emptyIcon={<RedditIcon size={32} />}
      emptyText={t("reddit.emptyState")}
      addFirstLabel={t("reddit.addFirstAccount")}
      addLabel={t("reddit.addAccount")}
      renderBadge={(account: Account) => (
        <>
          <Badge className="text-[10px] px-1.5">{t("badge.reddit")}</Badge>
          {account.auth_type === "reddit_public" && (
            <Badge className="text-[10px] px-1.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              {t("badge.redditPublic")}
            </Badge>
          )}
        </>
      )}
      renderHeader={() => (
        <div>
          <h3 className="text-sm font-semibold mb-3">{t("reddit.whatYouCanTrack")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <ThumbsUp size={20} className="text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm font-medium">{t("reddit.preview.karma")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.karmaDesc")}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <MessageSquare size={20} className="text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm font-medium">{t("reddit.preview.posts")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.postsDesc")}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <TrendingUp size={20} className="text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm font-medium">{t("reddit.preview.score")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.scoreDesc")}</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <MessageSquare size={20} className="text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm font-medium">{t("reddit.preview.comments")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t("reddit.preview.commentsDesc")}</p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
