"use client";

import { Star, GitFork } from "lucide-react";
import { languageColor } from "./constants";

export function RepoChip({ name, language, stars, forks, onClick }: {
  name: string; language: string | null; stars: number; forks: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-left min-w-0"
    >
      {language && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: languageColor(language) }} />}
      <span className="text-xs font-medium truncate">{name}</span>
      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 flex items-center gap-1 ml-auto">
        <span className="flex items-center gap-0.5"><Star size={10} /> {stars.toLocaleString()}</span>
        <span className="flex items-center gap-0.5"><GitFork size={10} /> {forks.toLocaleString()}</span>
      </span>
    </button>
  );
}
