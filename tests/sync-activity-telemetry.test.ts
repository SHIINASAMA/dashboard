import { describe, it, expect } from "vitest";
import { SyncActivity } from "../lib/application/usecases/SyncActivity";
import { SyncTelemetry } from "../lib/application/usecases/SyncTelemetry";
import { Stars, Forks } from "../lib/domain/repo";
import type { RepoRepository } from "../lib/domain/ports";

class InMemoryRepo implements RepoRepository {
  store = new Map<string, any>();
  snapshots: any[] = [];
  async findAllByAccountIds(ids: number[]) { return Array.from(this.store.values()).filter(r => ids.includes(r.accountId)); }
  async findSnapshotsBefore() { return new Map(); }
  async findSnapshotsInWindow() { return new Map(); }
  async upsertRepos(repos: any[]) { for (const r of repos) { const k = `${r.accountId}:${r.repoId}`; const prev = this.store.get(k) || {}; this.store.set(k, { ...prev, ...r }); } }
  async upsertSnapshots(s: any[]) { this.snapshots.push(...s); }
}

const account = { id: 1, screenName: "alice", platform: "github" as const, ownerId: 1, instanceUrl: null, isActive: 1, authToken: "pat", authType: null };

describe("GitHub L1 issue/PR split (new arch, mock client, no PG)", () => {
  it("does not throw when client returns empty splits (PGA-free path)", async () => {
    const repo = new InMemoryRepo();
    const fakeFetcher = { fetchRepoMeta: async () => [{ type: "RepoMetaFetched" as const, repo: { accountId: 1, repoId: 1, fullName: "alice/r", stars: new Stars(1), forks: new Forks(1), isFork: 0, language: null, description: null, homepage: null, topics: "[]" } }] };
    const mockClient = {
      fetchUserStats: async () => ({ public_repos: 1, public_gists: 0, followers: 1, following: 1 }),
      fetchContributions: async () => [],
      fetchIssueSplits: async () => new Map([[1, { issues: 3, pullRequests: 2 }]]),
    };
    const uc = new SyncActivity(repo as any, fakeFetcher as any, undefined, mockClient as any);
    await expect(uc.execute(account as any)).resolves.not.toThrow();
  });
});

describe("GitHub L2 telemetry (new arch, mock client, no PG)", () => {
  it("does not throw with empty traffic/releases", async () => {
    const repo = new InMemoryRepo();
    const fakeFetcher = { fetchRepoMeta: async () => [{ type: "RepoMetaFetched" as const, repo: { accountId: 1, repoId: 1, fullName: "alice/r", stars: new Stars(1), forks: new Forks(1), isFork: 0, language: null, description: null, homepage: null, topics: "[]" } }] };
    const mockClient = { fetchRepoTraffic: async () => ({ clones: [], views: [], referrers: [], paths: [] }), fetchRepoReleases: async () => [] };
    const uc = new SyncTelemetry(repo as any, fakeFetcher as any, mockClient as any);
    await expect(uc.execute(account as any)).resolves.not.toThrow();
  });
});
