import { describe, it, expect } from "vitest";
import { PgRepoRepository } from "../lib/infra/drizzle/PgRepoRepository";

describe("PgRepoRepository", () => {
  it("findSnapshotsBefore returns empty Map when no data", async () => {
    const repo = new PgRepoRepository(null as any);
    const m = await repo.findSnapshotsBefore([1], "2026-08-20");
    expect(m).toBeInstanceOf(Map);
    expect(m.size).toBe(0);
  });
  it("findSnapshotsInWindow returns empty Map", async () => {
    const repo = new PgRepoRepository(null as any);
    const m = await repo.findSnapshotsInWindow([1], "2026-08-10", "2026-08-20");
    expect(m.size).toBe(0);
  });
  it("findAllByAccountIds returns empty array", async () => {
    const repo = new PgRepoRepository(null as any);
    const arr = await repo.findAllByAccountIds([1]);
    expect(arr).toEqual([]);
  });
});
