import { describe, it, expect } from "vitest";
import { GithubFetcher } from "../lib/infra/fetchers/GithubFetcher";
import { GithubClient } from "../lib/infra/fetchers/GithubClient";

class FakeClient {
  constructor(private raws: any[]) {}
  async fetchAllRepos(){ return this.raws; }
}

describe("GithubFetcher", () => {
  it("maps fork to is_fork and does not write DB", async () => {
    const raws = [
      {id:1, name:"orig", full_name:"alice/orig", description:null, language:"TS", stargazers_count:100, forks_count:20, fork:false, topics:[], homepage:null, pushed_at:null, updated_at:null, created_at:null},
      {id:2, name:"forked", full_name:"alice/forked", description:null, language:null, stargazers_count:5, forks_count:1, fork:true, topics:[], homepage:null, pushed_at:null, updated_at:null, created_at:null},
    ];
    const f = new GithubFetcher(new FakeClient(raws) as unknown as GithubClient);
    const events = await f.fetchRepoMeta({id:1, screenName:"alice", platform:"github", ownerId:1, instanceUrl:null, isActive:1} as any);
    expect(events.length).toBe(2);
    expect(events[0].repo.isFork).toBe(0);
    expect(events[0].repo.stars.value).toBe(100);
    expect(events[1].repo.isFork).toBe(1);
  });
  it("handles empty", async () => {
    const f = new GithubFetcher(new FakeClient([]) as unknown as GithubClient);
    const events = await f.fetchRepoMeta({id:1, screenName:"alice", platform:"github", ownerId:1, instanceUrl:null, isActive:1} as any);
    expect(events.length).toBe(0);
  });
});
