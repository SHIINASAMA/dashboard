// L1 90m — timely metrics: stars/forks/issues/PRs/downloads + followers/contributions
import type { RepoRepository, FetcherPort, Clock } from "../../domain/ports";
import type { Account } from "../../domain/account";

interface GithubActivityClient {
  fetchUserStats(username: string, token?: string): Promise<Record<string, unknown>>;
  fetchContributions(username: string, token?: string, year?: number): Promise<Array<{ date: string; count: number; level: number }>>;
}

export class SyncActivity {
  constructor(
    private repos: RepoRepository,
    private fetcher: FetcherPort,
    private clock: Clock = { now: () => new Date() },
    private githubClient?: GithubActivityClient,
  ) {}

  async execute(account: Account): Promise<void> {
    const events = await this.fetcher.fetchRepoMeta(account);
    const repos = events.map((e) => e.repo);
    // Update timely counters
    await this.repos.upsertRepos(repos);
    const snapshotDate = this.clock.now().toISOString().slice(0, 10);
    const snapshots = repos.map((r) => ({
      accountId: r.accountId,
      repoId: r.repoId,
      stars: r.stars.value,
      forks: r.forks.value,
      snapshotDate,
    }));
    if (snapshots.length > 0) {
      await this.repos.upsertSnapshots(snapshots);
    }
    // Pure new: also refresh followers and contributions (L1 timely) to keep pulse audience compatible
    try {
      const client = this.githubClient;
      if (client && account.platform === "github") {
        const token = (account as unknown as { authToken?: string }).authToken ?? undefined;
        const stats = await client.fetchUserStats(account.screenName, token);
        const { insertGithubStats } = await import("../../repositories/github");
        await insertGithubStats({
          account_id: account.id,
          public_repos: (stats["public_repos"] as number) ?? 0,
          public_gists: (stats["public_gists"] as number) ?? 0,
          followers: (stats["followers"] as number) ?? 0,
          following: (stats["following"] as number) ?? 0,
        });
        const contribs = await client.fetchContributions(account.screenName, token);
        if (contribs.length > 0) {
          const { upsertGithubContributions } = await import("../../repositories/github");
          for (const c of contribs) {
            await upsertGithubContributions(account.id, [c]);
          }
        }
      }
    } catch { /* stats is best-effort, repos already updated */ }
    // TODO: picks up open_issues/open_pull_requests via issue-split and releases downloads
    // will be split from fetchers/github.ts:fetchGithubIssueSplits / fetchRepoReleases into this UseCase
  }
}
