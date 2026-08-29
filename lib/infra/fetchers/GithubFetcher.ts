import type { Account } from "../../domain/account";
import type { FetcherPort, RepoFetchedEvent } from "../../domain/ports";
import type { GithubClient } from "./GithubClient";
import { toRepo } from "./GithubMapper";

export class GithubFetcher implements FetcherPort {
  constructor(private client: GithubClient) {}

  async fetchRepoMeta(account: Account): Promise<RepoFetchedEvent[]> {
    const raws = await this.client.fetchAllRepos(account.screenName, (account as unknown as {authToken?: string; auth_token?: string}).authToken ?? (account as unknown as {authToken?: string; auth_token?: string}).auth_token ?? undefined);
    return raws.map(raw => ({
      type: "RepoMetaFetched" as const,
      repo: toRepo(raw as Record<string, unknown>, account.id),
    }));
  }
}
