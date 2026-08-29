import { describe, it, expect } from "vitest";
import { SyncRepoMeta } from "../lib/application/usecases/SyncRepoMeta";
import type { RepoRepository } from "../lib/domain/ports";
import { Stars, Forks } from "../lib/domain/repo";

class InMemoryRepoRepo implements RepoRepository {
  store = new Map<string, any>();
  constructor(initial: any[] = []) {
    for (const r of initial) this.store.set(`${r.accountId}:${r.repoId}`, r);
  }
  async findAllByAccountIds(ids: number[]) {
    return Array.from(this.store.values()).filter(r => ids.includes(r.accountId));
  }
  async findSnapshotsBefore(){ return new Map(); }
  async findSnapshotsInWindow(){ return new Map(); }
  async upsertRepos(repos:any[]){
    for (const r of repos) this.store.set(`${r.accountId}:${r.repoId}`, r);
  }
  async upsertSnapshots(){}
}

class FakeFetcher {
  constructor(private raws:any[]){}
  async fetchRepoMeta(_account:any){
    return this.raws.map(r=>({type:"RepoMetaFetched" as const, repo: r}));
  }
}

describe("SyncRepoMeta", () => {
  it("upserts detached fork (is_fork 1 -> 0)", async () => {
    const repoRepo = new InMemoryRepoRepo([{accountId:1, repoId:1, isFork:1, stars: new Stars(80), forks: new Forks(10)}]);
    const newRepo = {accountId:1, repoId:1, isFork:0, stars: new Stars(100), forks: new Forks(20), name:"r", fullName:"a/r", language:null, description:null, homepage:null, topics:"[]"};
    const fetcher = new FakeFetcher([newRepo]);
    const uc = new SyncRepoMeta(repoRepo as any, fetcher as any);
    await uc.execute({id:1, screenName:"alice", platform:"github", ownerId:1, instanceUrl:null, isActive:1} as any);
    const after = (await repoRepo.findAllByAccountIds([1]))[0];
    expect(after.isFork).toBe(0);
    expect(after.stars.value).toBe(100);
  });
  it("writes snapshots", async () => {
    const repoRepo = new InMemoryRepoRepo([]);
    let snapWritten: any[] = [];
    repoRepo.upsertSnapshots = async (s:any[]) => { snapWritten = s; };
    const newRepo = {accountId:1, repoId:2, isFork:0, stars: new Stars(50), forks: new Forks(5), name:"r2", fullName:"a/r2", language:null, description:null, homepage:null, topics:"[]"};
    const fetcher = new FakeFetcher([newRepo]);
    const uc = new SyncRepoMeta(repoRepo as any, fetcher as any);
    await uc.execute({id:1, screenName:"alice", platform:"github", ownerId:1, instanceUrl:null, isActive:1} as any);
    expect(snapWritten.length).toBe(1);
    expect(snapWritten[0].repoId).toBe(2);
  });
});
