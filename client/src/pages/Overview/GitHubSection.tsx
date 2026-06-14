import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type Account } from "../../api";
import { StatCard } from "../../components/StatCard";
import { GithubIcon } from "../../components/BrandIcons";
import { Star, GitFork, TrendingUp } from "lucide-react";
import { RepoChip } from "./RepoChip";

interface RepoLike {
  id: number;
  account_id: number;
  repo_id?: number;
  project_id?: number;
  name: string;
  language: string | null;
  stars: number;
  forks: number;
  pinned: boolean;
}

interface Props {
  ghAllRepos: RepoLike[];
  ghPinned: RepoLike[];
  ghTotalStars: number;
  ghTotalForks: number;
  ghFollowers: number;
  ghAccounts: Account[];
}

export function GitHubSection({ ghAllRepos, ghPinned, ghTotalStars, ghTotalForks, ghFollowers, ghAccounts }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (ghAccounts.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><GithubIcon /> {t("overview.githubHeading")}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title={t("overview.stats.repos")} value={ghAllRepos.length} icon={<GithubIcon />} />
        <StatCard title={t("overview.stats.totalStars")} value={ghTotalStars} icon={<Star size={16} />} />
        <StatCard title={t("overview.stats.totalForks")} value={ghTotalForks} icon={<GitFork size={16} />} />
        <StatCard title={t("overview.stats.followers")} value={ghFollowers} icon={<TrendingUp size={16} />} />
      </div>

      {ghPinned.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.pinnedRepos")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {ghPinned.map((repo) => {
              const acc = ghAccounts.find((a) => a.id === repo.account_id);
              return (
                <RepoChip key={repo.id} name={repo.name} language={repo.language} stars={repo.stars} forks={repo.forks}
                  onClick={() => navigate(`/github/${acc?.id ?? repo.account_id}/repos/${repo.repo_id}`)} />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
