import type { Account } from "../../domain/account";
import type { FetcherPort, RepoFetchedEvent } from "../../domain/ports";
import { toRepo } from "./GithubMapper";
import { getLogger } from "../../logger";

// Accepts any client exposing fetchAllRepos (real GithubClient or MockGithubClient)
interface RepoClient {
  fetchAllRepos(username: string, token?: string): Promise<unknown[]>;
}

export class GithubFetcher implements FetcherPort {
  constructor(private client: RepoClient) {}

  async fetchRepoMeta(account: Account): Promise<RepoFetchedEvent[]> {
    const logger = getLogger();
    const token = (account as unknown as {authToken?: string; auth_token?: string}).authToken ?? (account as unknown as {authToken?: string; auth_token?: string}).auth_token ?? undefined;
    logger.info("GitHub", "Fetching @%s repos...(token=%s)", account.screenName, token ? "set" : "NONE");
    let raws: unknown[];
    try {
      raws = await this.client.fetchAllRepos(account.screenName, token);
    } catch (e) {
      logger.warn("GitHub", "@%s: fetchAllRepos failed: %s", account.screenName, e instanceof Error ? e.message : String(e));
      throw e;
    }
    logger.info("GitHub", "@%s: fetched %d raw repos", account.screenName, raws.length);
    return raws.map(raw => ({
      type: "RepoMetaFetched" as const,
      repo: toRepo(raw as Record<string, unknown>, account.id),
    }));
  }
}
