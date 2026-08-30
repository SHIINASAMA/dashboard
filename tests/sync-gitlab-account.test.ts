import { describe, it, expect } from "vitest";
import { SyncGitlabAccount } from "../lib/application/usecases/SyncGitlabAccount";
import type { GitlabWrite, GitlabProject, GitlabSnapshot, GitlabRelease } from "../lib/application/usecases/GitlabWrite";
import type { Account } from "../lib/domain/account";

class FakeGitlabClient {
  constructor(private opts: { user?: any; projects?: any[]; releases?: any[]; events?: any[]; throwReleases?: boolean }) {}
  async fetchUser(_token: string) { return this.opts.user ?? { id: "42", followers: 3, following: 1 }; }
  async fetchAllProjects(_userId: string, _token: string) {
    return this.opts.projects ?? [
      { id: 1, name: "p1", path_with_namespace: "alice/p1", star_count: 10, forks_count: 2, open_issues_count: 3, forked_from_project: null, visibility: "public", created_at: "2026-01-01", updated_at: "2026-01-02", last_activity_at: "2026-01-03" },
      { id: 2, name: "p2", path_with_namespace: "alice/p2", star_count: 5, forks_count: 1, open_issues_count: 0, forked_from_project: { id: 99 }, visibility: "public" },
    ];
  }
  async fetchReleases(_id: number, _token: string) {
    if (this.opts.throwReleases) throw new Error("releases 403");
    return this.opts.releases ?? [{ tag_name: "v1.0.0", name: "v1", released_at: "2026-02-01" }];
  }
  async fetchContributionEvents(_userId: string, _token: string) {
    return this.opts.events ?? [{ created_at: "2026-03-01T00:00:00Z" }, { created_at: "2026-03-01T05:00:00Z" }, { created_at: "2026-03-02T00:00:00Z" }];
  }
}

class InMemoryWrite implements GitlabWrite {
  projects: GitlabProject[] = [];
  snapshots: GitlabSnapshot[] = [];
  stats: any[] = [];
  contributions: any[] = [];
  releases: GitlabRelease[] = [];
  accountUpdates: any[] = [];
  async upsertProject(p: GitlabProject) { const i = this.projects.findIndex(x => x.project_id === p.project_id); if (i >= 0) this.projects[i] = p; else this.projects.push(p); }
  async upsertSnapshot(s: GitlabSnapshot) { this.snapshots.push(s); }
  async insertStats(s: any) { this.stats.push(s); }
  async upsertContributions(accountId: number, entries: Array<{ date: string; count: number }>) { this.contributions.push({ accountId, entries }); }
  async upsertRelease(r: GitlabRelease) { this.releases.push(r); }
  async updateAccount(id: number, updates: any) { this.accountUpdates.push({ id, updates }); }
}

const account = { id: 7, screenName: "alice", platform: "gitlab" as const, ownerId: 1, instanceUrl: "https://gitlab.com", isActive: 1, authToken: "glpat-x" };

describe("SyncGitlabAccount (new arch, no PG)", () => {
  it("writes projects, snapshots, stats, contributions", async () => {
    const write = new InMemoryWrite();
    const uc = new SyncGitlabAccount(account as Account, new FakeGitlabClient({}) as any, write as any);
    const r = await uc.execute(account as Account);
    expect(r.status).toBe("success");
    expect(write.projects.length).toBe(2);
    expect(write.snapshots.length).toBe(2);
    expect(write.stats[0].public_projects).toBe(2);
    // 2 events on 03-01, 1 on 03-02 -> 2 contribution days
    expect(write.contributions[0].entries.length).toBe(2);
    expect(write.releases.length).toBe(2); // 1 release per project
  });

  it("marks partial when releases fail (best-effort, not fatal)", async () => {
    const write = new InMemoryWrite();
    const uc = new SyncGitlabAccount(account as Account, new FakeGitlabClient({ throwReleases: true }) as any, write as any);
    const r = await uc.execute(account as Account);
    expect(r.status).toBe("partial");
    expect(r.capabilityGaps.some(g => g.capability === "gitlab_releases")).toBe(true);
    expect(write.projects.length).toBe(2); // projects still saved
  });

  it("maps forked project to is_fork=1", async () => {
    const write = new InMemoryWrite();
    const uc = new SyncGitlabAccount(account as Account, new FakeGitlabClient({}) as any, write as any);
    await uc.execute(account as Account);
    const p2 = write.projects.find(p => p.project_id === 2)!;
    expect(p2.is_fork).toBe(1);
  });
});
