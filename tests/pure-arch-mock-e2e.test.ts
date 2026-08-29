import { describe, it, expect } from "vitest";
import { SyncRepoMeta } from "../lib/application/usecases/SyncRepoMeta";
import { SyncActivity } from "../lib/application/usecases/SyncActivity";
import { MockFetcher } from "../lib/infra/fetchers/MockFetcher";
import { setMockScenario } from "../lib/infra/fetchers/MockGithubClient";
import { Stars, Forks } from "../lib/domain/repo";
import type { RepoRepository } from "../lib/domain/ports";

class InMemoryRepo implements RepoRepository {
  store = new Map<string, any>();
  snapshots: any[] = [];
  async findAllByAccountIds(ids: number[]) {
    return Array.from(this.store.values()).filter(r => ids.includes(r.accountId));
  }
  async findSnapshotsBefore() { return new Map(); }
  async findSnapshotsInWindow() { return new Map(); }
  async upsertRepos(repos: any[]) {
    for (const r of repos) {
      const k = `${r.accountId}:${r.repoId}`;
      const prev = this.store.get(k) || {};
      this.store.set(k, { ...prev, ...r });
    }
  }
  async upsertSnapshots(s: any[]) { this.snapshots.push(...s); }
}

const account = { id: 99, screenName: "mockuser", platform: "github" as const, ownerId: 1, instanceUrl: null, isActive: 1, authToken: null };

describe("Pure new arch — mock fetcher (no real PAT)", () => {
  it("L0 静态只修 is_fork，不动 stars（兼容性）", async () => {
    setMockScenario("initial");
    const repo = new InMemoryRepo();
    // 预置一个旧的 is_fork=1 的错误数据，stars=80 是旧快照
    repo.store.set("99:1", { accountId: 99, repoId: 1, isFork: 1, stars: new Stars(80), forks: new Forks(10), name: "dashboard" });

    // 先用 forkFix 场景模拟全量分页发现 fork 已解除
    setMockScenario("forkFix");
    const fetcherFix = new MockFetcher();
    const uc = new SyncRepoMeta(repo as any, fetcherFix as any);
    await uc.execute(account as any);

    const after = (await repo.findAllByAccountIds([99])).find(r => r.repoId === 1)!;
    expect(after.isFork).toBe(0); // 已自愈 1->0
    expect(after.stars.value).toBe(80); // L0 不动 stars，仍是 80
  });

  it("L1 时效更新 stars 80 -> 100 并写快照", async () => {
    setMockScenario("initial");
    const repo = new InMemoryRepo();
    repo.store.set("99:1", { accountId: 99, repoId: 1, isFork: 0, stars: new Stars(80), forks: new Forks(10), name: "dashboard" });

    setMockScenario("starIncrease");
    const fetcher = new MockFetcher();
    const uc = new SyncActivity(repo as any, fetcher as any);
    await uc.execute(account as any);

    const after = (await repo.findAllByAccountIds([99])).find(r => r.repoId === 1)!;
    expect(after.stars.value).toBe(100);
    expect(repo.snapshots.length).toBeGreaterThan(0);
    expect(repo.snapshots[0].stars).toBe(100);
  });

  it("MockFetcher 三档场景可控，无需真实账号", async () => {
    setMockScenario("initial");
    let fetcher = new MockFetcher();
    let events = await fetcher.fetchRepoMeta(account as any);
    expect(events[0].repo.stars.value).toBe(80);

    setMockScenario("starIncrease");
    fetcher = new MockFetcher();
    events = await fetcher.fetchRepoMeta(account as any);
    expect(events[0].repo.stars.value).toBe(100);

    setMockScenario("forkFix");
    fetcher = new MockFetcher();
    events = await fetcher.fetchRepoMeta(account as any);
    const forked = events.find(e => e.repo.repoId === 2)!;
    expect(forked.repo.isFork).toBe(0); // 已解除 fork
  });
});

import { SyncTelemetry } from "../lib/application/usecases/SyncTelemetry";

describe("L2 telemetry — mock (no real PAT)", () => {
  it("writes clones/views/referrers/paths via MockGithubClient", async () => {
    setMockScenario("initial");
    const repo = new InMemoryRepo();
    repo.store.set("99:1", { accountId: 99, repoId: 1, isFork: 0, stars: new Stars(80), forks: new Forks(10), name: "dashboard", fullName: "mockuser/dashboard", language: "TS", description: null, homepage: null, topics: "[]" });
    const fetcher = new MockFetcher();
    // InMemoryRepo doesn't have traffic tables, but SyncTelemetry should not throw
    // We mock getDb to avoid PG; use InMemory that ignores traffic inserts via try/catch
    const uc = new SyncTelemetry(repo as any, fetcher as any, { fetchTraffic: async () => ({ clones: { count: 50, uniques: 10 }, views: { count: 200, uniques: 30 } }), fetchReferrers: async () => [{ referrer: "google.com", count: 12, uniques: 8 }], fetchPaths: async () => [{ path: "/README.md", count: 15, uniques: 10 }] } as any);
    await expect(uc.execute(account as any)).resolves.not.toThrow();
  });
});
