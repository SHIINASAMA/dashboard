// L2 8h — telemetry trends: traffic clones/views, referrers, paths, releases + download snapshots
import type { RepoRepository, FetcherPort } from "../../domain/ports";
import type { Account } from "../../domain/account";
import { getLogger } from "../../logger";

interface GithubTelemetryClient {
  fetchRepoTraffic(fullName: string, token?: string): Promise<{
    clones: Array<{ date: string; count: number; uniques: number }>;
    views: Array<{ date: string; count: number; uniques: number }>;
    referrers: Array<{ referrer: string; count: number; uniques: number }>;
    paths: Array<{ path: string; title: string | null; count: number; uniques: number }>;
  }>;
  fetchRepoReleases(fullName: string, token?: string): Promise<Array<Record<string, unknown>>>;
}

function toDownloadSnapshotTimestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export class SyncTelemetry {
  constructor(
    private repos: RepoRepository,
    private fetcher: FetcherPort,
    private githubClient?: GithubTelemetryClient,
  ) {}

  async execute(account: Account): Promise<void> {
    const client = this.githubClient;
    if (!client) return;
    const events = await this.fetcher.fetchRepoMeta(account);
    const repos = events.map(e => e.repo);
    if (repos.length === 0) return;

    const token = (account as unknown as { authToken?: string }).authToken ?? undefined;
    const { getDb } = await import("../../db/connection");
    const { github_traffic_clones, github_traffic_views, github_referrers, github_paths, github_releases, github_release_assets } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    let db: ReturnType<typeof getDb>;
    try { db = getDb(); } catch { return; }

    const today = new Date().toISOString().slice(0, 10);
    const snapshotDate = toDownloadSnapshotTimestamp();
    const logger = getLogger();

    for (const repo of repos) {
      const fullName = repo.fullName;
      // Traffic (clones/views/referrers/paths)
      try {
        const traffic = await client.fetchRepoTraffic(fullName, token);
        for (const d of traffic.clones) await db.insert(github_traffic_clones).values({ account_id: account.id, repo_id: repo.repoId, date: d.date, count: d.count, uniques: d.uniques }).onConflictDoNothing();
        for (const d of traffic.views) await db.insert(github_traffic_views).values({ account_id: account.id, repo_id: repo.repoId, date: d.date, count: d.count, uniques: d.uniques }).onConflictDoNothing();
        for (const r of traffic.referrers) await db.insert(github_referrers).values({ account_id: account.id, repo_id: repo.repoId, referrer: r.referrer, count: r.count, uniques: r.uniques, snapshot_date: today }).onConflictDoNothing();
        for (const p of traffic.paths) await db.insert(github_paths).values({ account_id: account.id, repo_id: repo.repoId, path: p.path, title: p.title, count: p.count, uniques: p.uniques, snapshot_date: today }).onConflictDoNothing();
      } catch { void 0; }

      // Releases + asset download snapshots
      try {
        const releases = await client.fetchRepoReleases(fullName, token);
        const { upsertGithubRelease, insertGithubReleaseAsset, upsertGithubReleaseAssetSnapshot } = await import("../../repositories/github");
        for (const release of releases) {
          const totalDownloads = ((release.assets as Array<Record<string, unknown>>) || []).reduce((s: number, a: Record<string, unknown>) => s + ((a.download_count as number) || 0), 0);
          await upsertGithubRelease({
            account_id: account.id, repo_id: repo.repoId, release_id: release.id as number,
            tag_name: (release.tag_name as string) || null, name: (release.name as string) || null, body: (release.body as string) || null,
            prerelease: release.prerelease ? 1 : 0, published_at: (release.published_at as string) || null, html_url: (release.html_url as string) || null, total_downloads: totalDownloads,
          });
          const [releaseRow] = await db.select({ id: github_releases.id }).from(github_releases).where(and(eq(github_releases.account_id, account.id), eq(github_releases.repo_id, repo.repoId), eq(github_releases.release_id, release.id as number)));
          if (releaseRow) {
            await db.delete(github_release_assets).where(eq(github_release_assets.release_id, releaseRow.id));
            for (const asset of (release.assets as Array<Record<string, unknown>>) || []) {
              const downloadCount = (asset.download_count as number) || 0;
              await insertGithubReleaseAsset({ release_db_id: releaseRow.id, name: asset.name as string, download_count: downloadCount, size: (asset.size as number) || 0, content_type: (asset.content_type as string) || null, browser_download_url: (asset.browser_download_url as string) || null });
              await upsertGithubReleaseAssetSnapshot({ account_id: account.id, repo_id: repo.repoId, release_id: releaseRow.id, asset_name: asset.name as string, download_count: downloadCount, snapshot_date: snapshotDate });
            }
          }
        }
      } catch { void 0; }
    }
    logger.info("GitHub", "L2 @%s: telemetry (traffic/releases) fetched for %d repos", account.screenName, repos.length);
  }
}
