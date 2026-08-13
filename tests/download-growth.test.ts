import { describe, it, expect } from "vitest";
import {
  computeDownloadGrowth,
  toDownloadSnapshotTimestamp,
  type DownloadSnapshot,
} from "../lib/utils/download-growth";

const snap = (release_id: number, asset_name: string, snapshot_date: string, download_count: number): DownloadSnapshot => ({
  release_id,
  asset_name,
  snapshot_date,
  download_count,
});

describe("computeDownloadGrowth", () => {
  it("computes downloads/day over the full window when snapshots span it", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-07-30", 100),
      snap(1, "app-linux.zip", "2026-08-13", 380),
    ];
    const [g] = computeDownloadGrowth(snaps, 14);
    expect(g.days).toBe(14);
    expect(g.latest_count).toBe(380);
    expect(g.previous_count).toBe(100);
    expect(g.rate).toBeCloseTo(20);
  });

  it("uses the snapshot nearest the window cutoff as baseline", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-07-20", 0),
      snap(1, "app-linux.zip", "2026-07-30", 100),
      snap(1, "app-linux.zip", "2026-08-13", 380),
    ];
    const [g] = computeDownloadGrowth(snaps, 14);
    expect(g.previous_count).toBe(100);
    expect(g.days).toBe(14);
    expect(g.rate).toBeCloseTo(20);
  });

  it("falls back to the earliest snapshot when all data is younger than the window", () => {
    const snaps = [
      snap(1, "app-mac.zip", "2026-08-05", 200),
      snap(1, "app-mac.zip", "2026-08-13", 320),
    ];
    const [g] = computeDownloadGrowth(snaps, 30);
    expect(g.days).toBe(8);
    expect(g.rate).toBeCloseTo(15);
  });

  it("keeps enough timestamp precision to distinguish fetches on the same UTC day", () => {
    expect(toDownloadSnapshotTimestamp(new Date("2026-08-13T01:00:00.000Z")))
      .not.toBe(toDownloadSnapshotTimestamp(new Date("2026-08-13T02:00:00.000Z")));
  });

  it("computes growth from two snapshots on the same UTC day", () => {
    const snaps = [
      snap(1, "app-mac.zip", "2026-08-13T01:00:00.000Z", 200),
      snap(1, "app-mac.zip", "2026-08-13T13:00:00.000Z", 260),
    ];
    const [g] = computeDownloadGrowth(snaps, 30);
    expect(g.days).toBeCloseTo(0.5);
    expect(g.rate).toBeCloseTo(120);
  });

  it("uses a sparse baseline older than the requested window", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-07-01T00:00:00.000Z", 100),
      snap(1, "app-linux.zip", "2026-08-13T00:00:00.000Z", 160),
    ];
    const [g] = computeDownloadGrowth(snaps, 30);
    expect(g.previous_count).toBe(100);
    expect(g.days).toBe(43);
    expect(g.rate).toBeCloseTo(60 / 43);
  });

  it("shows partial launch-window data from a single snapshot", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-14T00:00:00.000Z", 120),
    ];
    const releases = new Map([[1, "2026-08-13T00:00:00.000Z"]]);
    const [g] = computeDownloadGrowth(snaps, 7, releases);
    expect(g.previous_count).toBe(0);
    expect(g.latest_count).toBe(120);
    expect(g.days).toBe(1);
    expect(g.rate).toBe(120);
  });

  it("uses the actual sub-day coverage after publication", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-13T12:00:00.000Z", 120),
    ];
    const releases = new Map([[1, "2026-08-13T00:00:00.000Z"]]);
    const [g] = computeDownloadGrowth(snaps, 7, releases);
    expect(g.days).toBe(0.5);
    expect(g.rate).toBe(240);
  });

  it("shows a zero-download snapshot as data", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-14T00:00:00.000Z", 0),
    ];
    const releases = new Map([[1, "2026-08-13T00:00:00.000Z"]]);
    expect(computeDownloadGrowth(snaps, 7, releases)).toEqual([
      expect.objectContaining({ latest_count: 0, days: 1, rate: 0 }),
    ]);
  });

  it("anchors the selected period to release publication instead of today", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-14T00:00:00.000Z", 120),
      snap(1, "app-linux.zip", "2026-08-19T00:00:00.000Z", 420),
      snap(1, "app-linux.zip", "2026-08-23T00:00:00.000Z", 900),
    ];
    const releases = new Map([[1, "2026-08-13T00:00:00.000Z"]]);
    const [g] = computeDownloadGrowth(snaps, 7, releases);
    expect(g.latest_count).toBe(420);
    expect(g.days).toBe(6);
    expect(g.rate).toBe(70);
  });

  it("does not treat a post-window first snapshot as launch-window data", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-23T00:00:00.000Z", 900),
    ];
    const releases = new Map([[1, "2026-08-13T00:00:00.000Z"]]);
    expect(computeDownloadGrowth(snaps, 7, releases)).toEqual([]);
  });

  it("clamps negative deltas (asset re-upload / count reset) to zero", () => {
    const snaps = [
      snap(1, "app-win.exe", "2026-08-01", 500),
      snap(1, "app-win.exe", "2026-08-13", 200),
    ];
    const [g] = computeDownloadGrowth(snaps, 14);
    expect(g.rate).toBe(0);
  });

  it("skips groups with a single snapshot (cold start)", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-08-13", 100),
      snap(2, "app-mac.zip", "2026-08-13", 50),
    ];
    expect(computeDownloadGrowth(snaps, 14)).toEqual([]);
  });

  it("treats each release/asset pair independently", () => {
    const snaps = [
      snap(1, "app-linux.zip", "2026-07-30", 100),
      snap(1, "app-linux.zip", "2026-08-13", 380),
      snap(1, "app-mac.zip", "2026-07-30", 50),
      snap(1, "app-mac.zip", "2026-08-13", 170),
      snap(2, "app-linux.zip", "2026-07-30", 10),
      snap(2, "app-linux.zip", "2026-08-13", 40),
    ];
    const rates = computeDownloadGrowth(snaps, 14);
    expect(rates).toHaveLength(3);
    const byKey = new Map(rates.map((r) => [`${r.release_id}:${r.asset_name}`, r]));
    expect(byKey.get("1:app-linux.zip")!.rate).toBeCloseTo(20);
    expect(byKey.get("1:app-mac.zip")!.rate).toBeCloseTo(8.571428571428571);
    expect(byKey.get("2:app-linux.zip")!.rate).toBeCloseTo(30 / 14);
  });

  it("returns empty for no snapshots", () => {
    expect(computeDownloadGrowth([], 14)).toEqual([]);
  });
});
