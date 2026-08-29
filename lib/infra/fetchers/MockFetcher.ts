import type { Account } from "../../domain/account";
import type { FetcherPort, RepoFetchedEvent } from "../../domain/ports";
import { MockGithubClient, getMockScenario } from "./MockGithubClient";
import { toRepo } from "./GithubMapper";

/**
 * Mock FetcherPort for pure-new-arch testing without PAT.
 * Wraps MockGithubClient -> toRepo, same path as GithubFetcher.
 */
export class MockFetcher implements FetcherPort {
  private client = new MockGithubClient();
  async fetchRepoMeta(account: Account): Promise<RepoFetchedEvent[]> {
    const raws = await this.client.fetchAllRepos(account.screenName);
    return raws.map(raw => ({
      type: "RepoMetaFetched" as const,
      repo: toRepo(raw as Record<string, unknown>, account.id),
    }));
  }
  get scenario() { return getMockScenario(); }
}
