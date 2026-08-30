import { getDb } from "../../db/connection";
import { github_release_assets, github_releases } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { ReleaseWrite } from "../../application/usecases/SyncActivity";

export class PgReleaseWrite implements ReleaseWrite {
  async upsertRelease(r: Parameters<ReleaseWrite["upsertRelease"]>[0]): Promise<void> {
    const { upsertGithubRelease } = await import("../../repositories/github");
    await upsertGithubRelease(r);
  }

  async findReleaseDbId(accountId: number, repoId: number, releaseId: number): Promise<number | null> {
    const [row] = await getDb().select({ id: github_releases.id })
      .from(github_releases)
      .where(and(
        eq(github_releases.account_id, accountId),
        eq(github_releases.repo_id, repoId),
        eq(github_releases.release_id, releaseId),
      ));
    return row?.id ?? null;
  }

  async replaceAssets(releaseDbId: number, assets: Array<Record<string, unknown>>): Promise<void> {
    const { insertGithubReleaseAsset } = await import("../../repositories/github");
    await getDb().delete(github_release_assets).where(eq(github_release_assets.release_id, releaseDbId));
    for (const asset of assets) {
      await insertGithubReleaseAsset({
        release_db_id: releaseDbId,
        name: asset.name as string,
        download_count: (asset.download_count as number) || 0,
        size: (asset.size as number) || 0,
        content_type: (asset.content_type as string) || null,
        browser_download_url: (asset.browser_download_url as string) || null,
      });
    }
  }

  async insertAssetSnapshot(s: Parameters<ReleaseWrite["insertAssetSnapshot"]>[0]): Promise<void> {
    const { upsertGithubReleaseAssetSnapshot } = await import("../../repositories/github");
    await upsertGithubReleaseAssetSnapshot(s);
  }
}
