/**
 * Build cumulative download timelines for GitHub releases.
 *
 * A fetch records one cumulative count per release asset. Points sharing the
 * same timestamp are summed into a release total, then aligned by the numbered
 * day since publication so different releases can be compared on one chart.
 */

export interface DownloadSnapshot {
  release_id: number;
  asset_name: string;
  download_count: number;
  snapshot_date: string; // ISO timestamp; legacy rows may be YYYY-MM-DD
}

export interface ReleaseDownloadPoint {
  day: number;
  download_count: number;
  asset_downloads: Record<string, number>;
  snapshot_date: string;
}

export function sumSelectedAssetDownloads(
  point: Pick<ReleaseDownloadPoint, "asset_downloads">,
  selectedAssets: string[],
): number {
  return selectedAssets.reduce(
    (total, assetName) => total + (point.asset_downloads[assetName] ?? 0),
    0,
  );
}

function parseDate(date: string): number {
  return Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
}

export function toDownloadSnapshotTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function computeReleaseDownloadTimeline(
  snapshots: DownloadSnapshot[],
  publishedAt: string,
  windowDays: number,
): ReleaseDownloadPoint[] {
  const publishedAtMs = parseDate(publishedAt);
  if (!Number.isFinite(publishedAtMs)) return [];

  const assetsByTimestamp = new Map<string, Record<string, number>>();
  for (const snapshot of snapshots) {
    const timestamp = parseDate(snapshot.snapshot_date);
    if (!Number.isFinite(timestamp) || timestamp < publishedAtMs) continue;

    const day = Math.floor((timestamp - publishedAtMs) / 86_400_000) + 1;
    if (day > windowDays) continue;
    const assetDownloads = assetsByTimestamp.get(snapshot.snapshot_date) ?? {};
    assetDownloads[snapshot.asset_name] = snapshot.download_count;
    assetsByTimestamp.set(snapshot.snapshot_date, assetDownloads);
  }

  const latestByDay = new Map<number, ReleaseDownloadPoint>();
  for (const [snapshotDate, assetDownloads] of assetsByTimestamp) {
    const timestamp = parseDate(snapshotDate);
    const day = Math.floor((timestamp - publishedAtMs) / 86_400_000) + 1;
    const existing = latestByDay.get(day);
    if (!existing || parseDate(existing.snapshot_date) < timestamp) {
      latestByDay.set(day, {
        day,
        download_count: Object.values(assetDownloads).reduce((total, count) => total + count, 0),
        asset_downloads: assetDownloads,
        snapshot_date: snapshotDate,
      });
    }
  }

  return [...latestByDay.values()].sort((a, b) => a.day - b.day);
}
