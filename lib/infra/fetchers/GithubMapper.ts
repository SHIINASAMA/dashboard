import { Stars, Forks } from "../../domain/repo";

export function toRepo(raw: Record<string, unknown>, accountId: number) {
  return {
    accountId,
    repoId: raw.id as number,
    name: raw.name as string,
    fullName: raw.full_name as string,
    stars: new Stars((raw.stargazers_count as number) ?? 0),
    forks: new Forks((raw.forks_count as number) ?? 0),
    isFork: (raw.fork as boolean) ? 1 : 0,
    language: (raw.language as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    homepage: (raw.homepage as string | null) ?? null,
    topics: JSON.stringify((raw.topics as unknown[]) ?? []),
  };
}
