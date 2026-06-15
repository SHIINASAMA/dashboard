import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type Account } from "../../api";
import { StatCard } from "../../components/StatCard";
import { GitlabIcon } from "../../components/BrandIcons";
import { Star, GitFork, TrendingUp } from "lucide-react";
import { RepoChip } from "./RepoChip";

interface ProjectLike {
  id: number;
  account_id: number;
  project_id?: number;
  name: string;
  language: string | null;
  stars: number;
  forks: number;
  pinned: number | boolean;
}

interface Props {
  glAllProjects: ProjectLike[];
  glPinned: ProjectLike[];
  glTotalStars: number;
  glTotalForks: number;
  glFollowers: number;
  glAccounts: Account[];
}

export function GitLabSection({ glAllProjects, glPinned, glTotalStars, glTotalForks, glFollowers, glAccounts }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (glAccounts.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]"><GitlabIcon /> {t("overview.gitlabHeading")}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title={t("overview.stats.projects")} value={glAllProjects.length} icon={<GitlabIcon />} />
        <StatCard title={t("overview.stats.totalStars")} value={glTotalStars} icon={<Star size={16} />} />
        <StatCard title={t("overview.stats.totalForks")} value={glTotalForks} icon={<GitFork size={16} />} />
        <StatCard title={t("overview.stats.followers")} value={glFollowers} icon={<TrendingUp size={16} />} />
      </div>

      {glPinned.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{t("overview.pinnedProjects")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {glPinned.map((p) => {
              const acc = glAccounts.find((a) => a.id === p.account_id);
              return (
                <RepoChip key={p.id} name={p.name} language={p.language} stars={p.stars} forks={p.forks}
                  onClick={() => navigate(`/gitlab/${acc?.id ?? p.account_id}/projects/${p.project_id}`)} />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
