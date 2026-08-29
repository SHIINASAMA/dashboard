// L1 90m — timely metrics: stars/forks/issues/PRs/downloads + followers/contributions
import type { RepoRepository, FetcherPort, Clock } from "../../domain/ports";
import type { Account } from "../../domain/account";

export class SyncActivity {
  constructor(
    private repos: RepoRepository,
    private fetcher: FetcherPort,
    private clock: Clock = { now: () => new Date() },
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
    // TODO: picks up open_issues/open_pull_requests via issue-split and releases downloads
    // will be split from fetchers/github.ts:fetchGithubIssueSplits / fetchRepoReleases into this UseCase
  }
}
