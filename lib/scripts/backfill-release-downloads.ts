/**
 * One-time script: recalculate total_downloads for all existing GitHub releases.
 * Reads per-asset download counts from github_release_assets (already in DB).
 * Usage: pnpm backfill:release-downloads
 */

import { getDb } from "@/lib/db/connection";
import { github_releases, github_release_assets } from "@/db/schema/github";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();
  const allReleases = await db.select().from(github_releases);
  console.log(`Found ${allReleases.length} releases to backfill\n`);

  let updated = 0;
  let unchanged = 0;

  for (let i = 0; i < allReleases.length; i++) {
    const release = allReleases[i];

    const assets = await db.select().from(github_release_assets)
      .where(eq(github_release_assets.release_id, release.id));

    const newTotal = assets.reduce((sum, a) => sum + (a.download_count || 0), 0);

    if (newTotal !== release.total_downloads) {
      await db.update(github_releases)
        .set({ total_downloads: newTotal })
        .where(eq(github_releases.id, release.id));
      console.log(`[${i + 1}/${allReleases.length}] ${release.tag_name}: ${release.total_downloads} → ${newTotal}`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${unchanged} unchanged`);
}

main();
