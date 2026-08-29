// L2 8h — telemetry trends: traffic clones/views, referrers, paths
import type { RepoRepository, FetcherPort } from "../../domain/ports";
import type { Account } from "../../domain/account";

interface GithubTelemetryClient {
  fetchTraffic(repoFullName: string): Promise<{ clones: { count: number; uniques: number }; views: { count: number; uniques: number } }>;
  fetchReferrers(repoFullName: string): Promise<Array<{ referrer: string; count: number; uniques: number }>>;
  fetchPaths(repoFullName: string): Promise<Array<{ path: string; count: number; uniques: number }>>;
}

export class SyncTelemetry {
  constructor(
    private repos: RepoRepository,
    private fetcher: FetcherPort,
    private githubClient?: GithubTelemetryClient,
  ) {}

  async execute(account: Account): Promise<void> {
    // Need repo list to know which repos to fetch telemetry for
    const events = await this.fetcher.fetchRepoMeta(account);
    const repos = events.map(e => e.repo);
    if (repos.length === 0) return;

    const client = this.githubClient;
    // If no client (real GitHub without PAT mock), skip gracefully
    if (!client) return;

    const { getDb } = await import("../../db/connection");
    const { github_traffic_clones, github_traffic_views, github_referrers, github_paths } = await import("@/db/schema");

    const today = new Date().toISOString().slice(0, 10);
    let db: ReturnType<typeof getDb>;
    try { db = getDb(); } catch { return; }

    for (const repo of repos) {
      const fullName = repo.fullName;
      try {
        const traffic = await client.fetchTraffic(fullName);
        await db.insert(github_traffic_clones).values({ account_id: account.id, repo_id: repo.repoId, date: today, count: traffic.clones.count, uniques: traffic.clones.uniques }).onConflictDoNothing();
        await db.insert(github_traffic_views).values({ account_id: account.id, repo_id: repo.repoId, date: today, count: traffic.views.count, uniques: traffic.views.uniques }).onConflictDoNothing();
      } catch { void 0; }
      try {
        const referrers = await client.fetchReferrers(fullName);
        for (const r of referrers) {
          await db.insert(github_referrers).values({ account_id: account.id, repo_id: repo.repoId, referrer: r.referrer, count: r.count, uniques: r.uniques, snapshot_date: today }).onConflictDoNothing();
        }
      } catch { void 0; }
      try {
        const paths = await client.fetchPaths(fullName);
        for (const p of paths) {
          await db.insert(github_paths).values({ account_id: account.id, repo_id: repo.repoId, path: p.path, count: p.count, uniques: p.uniques, snapshot_date: today }).onConflictDoNothing();
        }
      } catch { void 0; }
    }
  }
}
