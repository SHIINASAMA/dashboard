import type { Account } from "../../domain/account";
import type { FetcherPort, RepoFetchedEvent } from "../../domain/ports";
import { toRepo } from "./GithubMapper";

// Accepts any client exposing fetchAllRepos (real GithubClient or MockGithubClient)
interface RepoClient {
  fetchAllRepos(username: string, token?: string): Promise<unknown[]>;
}

export class GithubFetcher implements FetcherPort {
  constructor(private client: RepoClient) {}

  async fetchRepoMeta(account: Account): Promise<RepoFetchedEvent[]> {
    const raws = await this.client.fetchAllRepos(account.screenName, (account as unknown as {authToken?: string; auth_token?: string}).authToken ?? (account as unknown as {authToken?: string; auth_token?: string}).auth_token ?? undefined);
    return raws.map(raw => ({
      type: "RepoMetaFetched" as const,
      repo: toRepo(raw as Record<string, unknown>, account.id),
    }));
  }
}
