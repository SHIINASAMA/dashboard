/**
 * Pure helpers for computing per-asset download rates from cumulative
 * GitHub release-asset snapshots.
 *
 * When release timestamps are available, rates cover the selected launch
 * window and use zero downloads at publication as the baseline. Legacy
 * callers without release timestamps fall back to deltas between snapshots.
 */

export interface DownloadSnapshot {
  release_id: number;
  asset_name: string;
  download_count: number;
  snapshot_date: string; // ISO timestamp; legacy rows may be YYYY-MM-DD
}

export interface AssetGrowth {
  release_id: number;
  asset_name: string;
  latest_count: number;
  previous_count: number;
  days: number;
  rate: number; // downloads per day (absolute), clamped at 0
}

function parseDate(date: string): number {
  return Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
}

export function toDownloadSnapshotTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function addDaysIso(date: string, days: number): string {
  const d = new Date(parseDate(date));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ms = Math.abs(parseDate(a) - parseDate(b));
  return ms === 0 ? 1 : ms / 86_400_000;
}

export function computeDownloadGrowth(
  snapshots: DownloadSnapshot[],
  windowDays: number,
  releasePublishedAt?: ReadonlyMap<number, string>,
): AssetGrowth[] {
  const byKey = new Map<string, DownloadSnapshot[]>();
  for (const s of snapshots) {
    const key = `${s.release_id}\u0000${s.asset_name}`;
    const list = byKey.get(key);
    if (list) list.push(s);
    else byKey.set(key, [s]);
  }

  const result: AssetGrowth[] = [];
  for (const list of byKey.values()) {
    list.sort((a, b) => parseDate(a.snapshot_date) - parseDate(b.snapshot_date));

    const publishedAt = releasePublishedAt?.get(list[0].release_id);
    const publishedAtMs = publishedAt ? parseDate(publishedAt) : Number.NaN;
    if (Number.isFinite(publishedAtMs)) {
      const windowEnd = publishedAtMs + windowDays * 86_400_000;
      const launchSnapshots = list.filter((snapshot) => {
        const timestamp = parseDate(snapshot.snapshot_date);
        return timestamp >= publishedAtMs && timestamp <= windowEnd;
      });
      if (launchSnapshots.length === 0) continue;

      const latest = launchSnapshots[launchSnapshots.length - 1];
      const elapsedDays = (parseDate(latest.snapshot_date) - publishedAtMs) / 86_400_000;
      const days = elapsedDays === 0 ? 1 : elapsedDays;
      result.push({
        release_id: latest.release_id,
        asset_name: latest.asset_name,
        latest_count: latest.download_count,
        previous_count: 0,
        days,
        rate: latest.download_count <= 0 ? 0 : latest.download_count / days,
      });
      continue;
    }

    if (list.length < 2) continue;

    const latest = list[list.length - 1];
    const cutoff = parseDate(latest.snapshot_date) - windowDays * 86_400_000;

    // Baseline: the snapshot closest to the cutoff from below (latest date
    // <= cutoff). If all snapshots are younger than the window, fall back to
    // the earliest snapshot so the rate still covers the available history.
    let baseline = list[0];
    for (const s of list) {
      if (parseDate(s.snapshot_date) <= cutoff) baseline = s;
      else break;
    }

    const days = diffDays(latest.snapshot_date, baseline.snapshot_date);
    const delta = latest.download_count - baseline.download_count;
    result.push({
      release_id: latest.release_id,
      asset_name: latest.asset_name,
      latest_count: latest.download_count,
      previous_count: baseline.download_count,
      days,
      rate: delta <= 0 ? 0 : delta / days,
    });
  }
  return result;
}
