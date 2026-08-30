// L1 90m — timely metrics: stars/forks/issues/PRs/downloads + followers/contributions
import type { RepoRepository, FetcherPort, Clock } from "../../domain/ports";
import type { Account } from "../../domain/account";
import { getLogger } from "../../logger";

interface GithubActivityClient {
  fetchUserStats(username: string, token?: string): Promise<Record<string, unknown>>;
  fetchContributions(username: string, token?: string, year?: number): Promise<Array<{ date: string; count: number; level: number }>>;
  fetchIssueSplits(repos: Array<{ id: number; full_name: string }>, token?: string): Promise<Map<number, { issues: number; pullRequests: number }>>;
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
    getLogger().info("GitHub", "L1 @%s: upsert %d repos + %d snapshots", account.screenName, repos.length, snapshots.length);
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

    // Issue/PR split — precisely separate open_issues vs open_pull_requests (needs PAT).
    try {
      const client = this.githubClient;
      if (client && account.platform === "github") {
        const token = (account as unknown as { authToken?: string }).authToken ?? undefined;
        const splitInput = repos.filter(r => r.fullName).map(r => ({ id: r.repoId, full_name: r.fullName }));
        const splits = await client.fetchIssueSplits(splitInput, token);
        if (splits.size > 0) {
          const { getDb } = await import("../../db/connection");
          const { github_repos } = await import("@/db/schema");
          const { and, eq } = await import("drizzle-orm");
          const db = getDb();
          for (const [repoId, counts] of splits) {
            await db.update(github_repos).set({ open_issues_only: counts.issues, open_pull_requests: counts.pullRequests })
              .where(and(eq(github_repos.account_id, account.id), eq(github_repos.repo_id, repoId)));
          }
          getLogger().info("GitHub", "L1 @%s: issue/PR split updated for %d repos", account.screenName, splits.size);
        }
      }
    } catch { /* issue split best-effort; requires PAT, non-fatal */ }
  }
}
