import { describe, expect, it } from "vitest";
import { latestSnapshotRows } from "../lib/utils/latest-snapshot";

describe("GitHub latest traffic snapshots", () => {
  it("excludes referrers that disappeared from the latest snapshot", () => {
    const rows = [
      { referrer: "stale.example", count: 100, snapshot_date: "2026-07-15" },
      { referrer: "current.example", count: 20, snapshot_date: "2026-07-16" },
    ];

    const result = latestSnapshotRows(rows);

    expect(result).toEqual([
      { referrer: "current.example", count: 20, snapshot_date: "2026-07-16" },
    ]);
  });

  it("excludes paths that disappeared from the latest snapshot", () => {
    const rows = [
      { path: "/stale", count: 100, snapshot_date: "2026-07-15" },
      { path: "/current", count: 20, snapshot_date: "2026-07-16" },
    ];

    const result = latestSnapshotRows(rows);

    expect(result).toEqual([
      { path: "/current", count: 20, snapshot_date: "2026-07-16" },
    ]);
  });
});
