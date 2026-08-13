import { describe, expect, it } from "vitest";
import {
  computeReleaseDownloadTimeline,
  sumSelectedAssetDownloads,
  toDownloadSnapshotTimestamp,
  type DownloadSnapshot,
} from "../lib/utils/download-growth";

const snap = (
  release_id: number,
  asset_name: string,
  snapshot_date: string,
  download_count: number,
): DownloadSnapshot => ({ release_id, asset_name, snapshot_date, download_count });

describe("computeReleaseDownloadTimeline", () => {
  it("uses enough timestamp precision to distinguish fetches on the same UTC day", () => {
    expect(toDownloadSnapshotTimestamp(new Date("2026-08-13T01:00:00.000Z")))
      .not.toBe(toDownloadSnapshotTimestamp(new Date("2026-08-13T02:00:00.000Z")));
  });

  it("plots cumulative release downloads by day since publication", () => {
    const snapshots = [
      snap(1, "linux.zip", "2026-08-13T12:00:00.000Z", 100),
      snap(1, "mac.zip", "2026-08-13T12:00:00.000Z", 50),
      snap(1, "linux.zip", "2026-08-14T12:00:00.000Z", 180),
      snap(1, "mac.zip", "2026-08-14T12:00:00.000Z", 90),
    ];

    expect(computeReleaseDownloadTimeline(snapshots, "2026-08-13T00:00:00.000Z", 7)).toEqual([
      { day: 1, download_count: 150, asset_downloads: { "linux.zip": 100, "mac.zip": 50 }, snapshot_date: "2026-08-13T12:00:00.000Z" },
      { day: 2, download_count: 270, asset_downloads: { "linux.zip": 180, "mac.zip": 90 }, snapshot_date: "2026-08-14T12:00:00.000Z" },
    ]);
  });

  it("sums only the files selected in the chart controls", () => {
    const point = {
      day: 1,
      download_count: 150,
      asset_downloads: { "linux.zip": 100, "mac.zip": 50 },
      snapshot_date: "2026-08-13T12:00:00.000Z",
    };

    expect(sumSelectedAssetDownloads(point, ["linux.zip", "mac.zip"])).toBe(150);
    expect(sumSelectedAssetDownloads(point, ["linux.zip"])).toBe(100);
    expect(sumSelectedAssetDownloads(point, [])).toBe(0);
  });

  it("uses the latest fetch when a release is fetched multiple times on one launch day", () => {
    const snapshots = [
      snap(1, "app.zip", "2026-08-13T03:00:00.000Z", 100),
      snap(1, "app.zip", "2026-08-13T18:00:00.000Z", 140),
    ];

    expect(computeReleaseDownloadTimeline(snapshots, "2026-08-13T00:00:00.000Z", 7)).toEqual([
      { day: 1, download_count: 140, asset_downloads: { "app.zip": 140 }, snapshot_date: "2026-08-13T18:00:00.000Z" },
    ]);
  });

  it("keeps partial data and limits points to the selected launch window", () => {
    const snapshots = [
      snap(1, "app.zip", "2026-08-14T00:00:00.000Z", 120),
      snap(1, "app.zip", "2026-08-19T00:00:00.000Z", 420),
      snap(1, "app.zip", "2026-08-20T12:00:00.000Z", 600),
    ];

    expect(computeReleaseDownloadTimeline(snapshots, "2026-08-13T00:00:00.000Z", 7)).toEqual([
      { day: 2, download_count: 120, asset_downloads: { "app.zip": 120 }, snapshot_date: "2026-08-14T00:00:00.000Z" },
      { day: 7, download_count: 420, asset_downloads: { "app.zip": 420 }, snapshot_date: "2026-08-19T00:00:00.000Z" },
    ]);
  });

  it("returns no points when there are no snapshots inside the launch window", () => {
    const snapshots = [snap(1, "app.zip", "2026-08-23T00:00:00.000Z", 900)];
    expect(computeReleaseDownloadTimeline(snapshots, "2026-08-13T00:00:00.000Z", 7)).toEqual([]);
  });
});
