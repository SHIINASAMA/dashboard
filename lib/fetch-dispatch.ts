import { finishFetchRun, startFetchRun } from "./repositories/fetch-runs";
import { updateAccount } from "./services/accounts";
import { getLogger } from "./logger";
import { isMockMode, isMockFetcherMode } from "./config";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";
import type { AccountRow } from "./repositories/accounts";
import type { Account } from "./domain/account";
import type { GithubClient } from "./infra/fetchers/GithubClient";
import type { MockGithubClient } from "./infra/fetchers/MockGithubClient";
import type { FetcherPort } from "./domain/ports";
import type { CapabilityGap, FetchRunStatus, FetchTrigger } from "./fetch-health";
import { isSupportedPlatform } from "./platforms";

type CompletedRunStatus = Exclude<FetchRunStatus, "running">;

type FetcherResult = boolean | number | {
  status?: CompletedRunStatus;
  errorMessage?: string | null;
  capabilityGaps?: CapabilityGap[];
};

interface FetcherError extends Error {
  fetchRunStatus?: FetchRunStatus;
}

const activeDispatches = new Set<number>();

function normalizeResult(result: FetcherResult): {
  status: CompletedRunStatus;
  errorMessage: string | null;
  capabilityGaps: CapabilityGap[];
} {
  if (typeof result === "object" && result !== null && result.status !== undefined) {
    return {
      status: result.status,
      errorMessage: result.errorMessage ?? null,
      capabilityGaps: result.capabilityGaps ?? [],
    };
  }
  if (result === false) {
    return { status: "failed", errorMessage: "Fetcher reported a failed run", capabilityGaps: [] };
  }
  return { status: "success", errorMessage: null, capabilityGaps: [] };
}

export async function dispatchFetch(account: AccountRow, trigger: FetchTrigger = "manual", level?: string) {
  if (!isSupportedPlatform(account.platform)) {
    getLogger().warn("FetchRun", "Account %s has unsupported platform %s; fetch skipped", account.id, account.platform);
    return { skipped: true };
  }

  if (activeDispatches.has(account.id)) {
    getLogger().info("FetchRun", "Account %s is already fetching; request skipped", account.id);
    return { skipped: true };
  }

  activeDispatches.add(account.id);
  try {
    let runId: number | undefined;
    try {
      const run = await startFetchRun(account.id, trigger);
      runId = Number(run?.id);
      if (Number.isNaN(runId)) runId = undefined;
    } catch (error) {
      getLogger().error(
        "FetchRun",
        "Unable to start run for account %s: %s",
        account.id,
        error instanceof Error ? error.message : String(error),
      );
    }

    if (runId !== undefined) {
      try {
        await updateAccount(account.id, { last_fetched_at: new Date().toISOString() });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await finishFetchRun({ id: runId, status: "failed", errorMessage: message });
        getLogger().error("FetchRun", "Unable to record attempt for account %s: %s", account.id, message);
        return false;
      }
    }

    return executeAndRecord(account, runId, trigger, level);
  } finally {
    activeDispatches.delete(account.id);
  }
}

async function executeAndRecord(
  account: AccountRow,
  runId: number | undefined,
  trigger: FetchTrigger,
  level?: string,
) {
  const startedAt = Date.now();
  try {
    // Level-aware new architecture with compatible fallback (Phase 2)
    // For github with level, try new UseCase first (shadow), keep old as fallback/supplement
    // Pure new architecture: level-aware, no fallback to old fetcher
    let result: FetcherResult | null = null;
    const platform = account.platform;
    const isNewArchPlatform = platform === "github" || platform === "gitlab" || platform === "reddit" || platform === "twitter";
    if (isNewArchPlatform && !isMockMode()) {
      const lvl = level ?? "l1";
      result = await executeWithNewArch(account, lvl) as FetcherResult;
      if (result === null) {
        throw new Error(`Unsupported fetch level ${lvl} for platform ${platform}`);
      }
    } else {
      // reddit/twitter + mock: legacy fetcher until their new adapters are built
      result = await selectFetcher(account)(account) as FetcherResult;
    }
    const outcome = normalizeResult(result);
    await finishFetchRun({
      id: runId,
      status: outcome.status,
      errorMessage: outcome.errorMessage,
      capabilityGaps: outcome.capabilityGaps,
    });
    getLogger().info(
      "FetchRun",
      "Account %s %s in %dms (%s)",
      account.id,
      outcome.status,
      Date.now() - startedAt,
      trigger,
    );
    return result;
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    const metadata = caught as FetcherError;
    await finishFetchRun({
      id: runId,
      status: metadata.fetchRunStatus === "partial" ? "partial" : "failed",
      errorMessage: error.message,
    });
    getLogger().warn("FetchRun", "Account %s failed in %dms: %s", account.id, Date.now() - startedAt, error.message);
    return false;
  }
}


function toDomainAccount(row: AccountRow): Account {
  return {
    id: row.id,
    screenName: row.screen_name ?? "",
    platform: row.platform as Account["platform"],
    ownerId: (row as unknown as { owner_id?: number; user_id?: number }).owner_id ?? (row as unknown as { owner_id?: number; user_id?: number }).user_id ?? 0,
    instanceUrl: row.instance_url ?? null,
    isActive: row.is_active ?? 1,
    userId: (row as unknown as { user_id?: string }).user_id ?? null,
    authToken: (row as unknown as { auth_token?: string }).auth_token ?? null,
    authType: (row as unknown as { auth_type?: string }).auth_type ?? null,
  };
}

async function executeWithNewArch(account: AccountRow, level: string): Promise<FetcherResult> {
  const domainAccount = toDomainAccount(account);
  if (domainAccount.platform === "gitlab") {
    // GitLab new architecture: GitlabClient -> SyncGitlabAccount -> repository
    const { SyncGitlabAccount } = await import("./application/usecases/SyncGitlabAccount");
    const uc = new SyncGitlabAccount(domainAccount);
    const r = await uc.execute(domainAccount);
    return { status: r.status, errorMessage: null, capabilityGaps: r.capabilityGaps } as FetcherResult;
  }
  if (domainAccount.platform === "reddit") {
    const { SyncRedditAccount } = await import("./application/usecases/SyncRedditAccount");
    const uc = new SyncRedditAccount(domainAccount);
    await uc.execute(domainAccount);
    return { status: "success", errorMessage: null, capabilityGaps: [] } as FetcherResult;
  }
  if (domainAccount.platform === "twitter") {
    const { SyncXAccount } = await import("./application/usecases/SyncXAccount");
    const uc = new SyncXAccount(domainAccount);
    const r = await uc.execute();
    return { status: r.status as "success" | "partial" | "failed", errorMessage: r.errors > 0 ? `${r.errors} tweet detail(s) could not be refreshed` : null, capabilityGaps: [] } as FetcherResult;
  }
  const { PgRepoRepository } = await import("./infra/drizzle/PgRepoRepository");
  const { GithubClient } = await import("./infra/fetchers/GithubClient");
  const { SyncRepoMeta } = await import("./application/usecases/SyncRepoMeta");
  const { SyncActivity } = await import("./application/usecases/SyncActivity");

  const repoRepo = new PgRepoRepository();
  // Mock only under explicit env flags (MOCK_DATA / MOCK_FETCHER); never keyed off a screenName
  const useMock = isMockMode() || isMockFetcherMode();
  let client: GithubClient | MockGithubClient;
  let fetcher: FetcherPort;
  if (useMock) {
    const { MockGithubClient } = await import("./infra/fetchers/MockGithubClient");
    const { MockFetcher } = await import("./infra/fetchers/MockFetcher");
    client = new MockGithubClient();
    fetcher = new MockFetcher();
  } else {
    client = new GithubClient();
    const { GithubFetcher } = await import("./infra/fetchers/GithubFetcher");
    fetcher = new GithubFetcher(client);
  }

  if (level === "l0") {
    const uc = new SyncRepoMeta(repoRepo, fetcher);
    await uc.execute(domainAccount);
    return { status: "success" as const, errorMessage: null, capabilityGaps: [] };
  }
  if (level === "l1") {
    const uc = new SyncActivity(repoRepo, fetcher, undefined, client);
    await uc.execute(domainAccount);
    return { status: "success" as const, errorMessage: null, capabilityGaps: [] };
  }
  if (level === "l2") {
    const { SyncTelemetry } = await import("./application/usecases/SyncTelemetry");
    const uc = new SyncTelemetry(repoRepo, fetcher, client);
    await uc.execute(domainAccount);
    return { status: "success" as const, errorMessage: null, capabilityGaps: [] };
  }
  // l2 and others: new SyncTelemetry is still TODO, fallback to old
  return null as unknown as FetcherResult;
}

export function selectFetcher(account: AccountRow) {
  if (isMockMode()) {
    return async () => true;
  }
  if (account.platform === "github") return fetchGithubAccount;
  if (account.platform === "gitlab") return fetchGitlabAccount;
  if (account.platform === "reddit") {
    return account.auth_type === "reddit_public" ? fetchRedditPublicAccount : fetchRedditAccount;
  }
  return fetchAccount;
}
