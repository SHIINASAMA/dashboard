import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { XIcon, GithubIcon, GitlabIcon, RedditIcon } from "../../components/BrandIcons";
import { useOverviewData } from "./useOverviewData";
import { XSection } from "./XSection";
import { GitHubSection } from "./GitHubSection";
import { GitLabSection } from "./GitLabSection";
import { RedditSection } from "./RedditSection";

export function Overview() {
  const { t } = useTranslation();
  const data = useOverviewData();
  const {
    stats, timeline, topLiked, allAccounts,
    xAccounts, ghAccounts, glAccounts, redditAccounts,
    ghOverviews, ghAllRepos, ghPinned, ghTotalStars, ghTotalForks,
    glOverviews, glAllProjects, glPinned, glTotalStars, glTotalForks,
    redditOverviews, redditKarmaTimeline, redditDailyActivity, mergedSubreddits,
    isLoading,
  } = data;

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">{t("common.loading")}</div>;
  }

  const ghFollowers = ghOverviews.reduce((s, o) => s + (o.data?.stats?.followers ?? 0), 0);
  const glFollowers = glOverviews.reduce((s, o) => s + (o.data?.stats?.followers ?? 0), 0);
  const redditPostKarma = redditOverviews.reduce((s, o) => s + (o.data?.stats?.post_karma ?? 0), 0);
  const redditCommentKarma = redditOverviews.reduce((s, o) => s + (o.data?.stats?.comment_karma ?? 0), 0);
  const redditTotalPosts = redditOverviews.reduce((s, o) => s + (o.data?.totalPosts ?? 0), 0);
  const redditTotalComments = redditOverviews.reduce((s, o) => s + (o.data?.totalComments ?? 0), 0);

  const showSepX_GH = xAccounts.length > 0 && ghAccounts.length > 0;
  const showSepGH_GL = (xAccounts.length > 0 || ghAccounts.length > 0) && glAccounts.length > 0;
  const showSepGL_Reddit = (xAccounts.length > 0 || ghAccounts.length > 0 || glAccounts.length > 0) && redditAccounts.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("overview.heading")}</h2>
          {allAccounts.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">{t("overview.description_addPrompt")}</p>
          )}
        </div>
        {allAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {allAccounts.map((acc: { id: number; platform: string; screen_name: string; error_message?: string | null }) => (
              <Badge key={acc.id} className="text-[10px] px-1.5 py-0.5 gap-0.5">
                {acc.platform === "twitter" ? <XIcon /> : acc.platform === "github" ? <GithubIcon /> : acc.platform === "gitlab" ? <GitlabIcon /> : <RedditIcon />}
                {acc.platform === "twitter" ? `@${acc.screen_name}` : acc.screen_name}
                {acc.error_message && <span className="text-[var(--danger)] ml-0.5">!</span>}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <XSection stats={stats} timeline={timeline} topLiked={topLiked} xAccounts={xAccounts} />

      {showSepX_GH && <Separator className="my-6" />}

      <GitHubSection
        ghAllRepos={ghAllRepos}
        ghPinned={ghPinned}
        ghTotalStars={ghTotalStars}
        ghTotalForks={ghTotalForks}
        ghFollowers={ghFollowers}
        ghAccounts={ghAccounts}
      />

      {showSepGH_GL && <Separator className="my-6" />}

      <GitLabSection
        glAllProjects={glAllProjects}
        glPinned={glPinned}
        glTotalStars={glTotalStars}
        glTotalForks={glTotalForks}
        glFollowers={glFollowers}
        glAccounts={glAccounts}
      />

      {showSepGL_Reddit && <Separator className="my-6" />}

      {redditAccounts.length > 0 && (
        <RedditSection
          postKarma={redditPostKarma}
          commentKarma={redditCommentKarma}
          totalPosts={redditTotalPosts}
          totalComments={redditTotalComments}
          karmaTimeline={redditKarmaTimeline}
          dailyActivity={redditDailyActivity}
          mergedSubreddits={mergedSubreddits}
        />
      )}

      {allAccounts.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] italic">{t("overview.noAccounts")}</p>
      )}
    </div>
  );
}
