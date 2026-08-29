import type { RepoRepository, FetcherPort, Clock } from "../../domain/ports";
import type { Account } from "../../domain/account";

export class SyncRepoMeta {
  constructor(
    private repos: RepoRepository,
    private fetcher: FetcherPort,
    private clock: Clock = { now: () => new Date() },
  ) {}

  async execute(account: Account): Promise<void> {
    const events = await this.fetcher.fetchRepoMeta(account);
    const repos = events.map(e => e.repo);
    await this.repos.upsertRepos(repos);
    const snapshotDate = this.clock.now().toISOString().slice(0, 10);
    const snapshots = repos.map(r => ({
      accountId: r.accountId,
      repoId: r.repoId,
      stars: r.stars.value,
      forks: r.forks.value,
      snapshotDate,
    }));
    if (snapshots.length > 0) {
      await this.repos.upsertSnapshots(snapshots);
    }
  }
}
