/**
 * Pure helpers for computing per-asset download growth rates from
 * cumulative download-count snapshots (GitHub release assets).
 *
 * GitHub's API only exposes cumulative per-asset download counts, so
 * "growth" is measured as the delta between two snapshots divided by the
 * calendar days between them (absolute downloads/day), clamped at 0.
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
