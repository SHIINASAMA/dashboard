import { finishFetchRun, startFetchRun } from "./repositories/fetch-runs";
import { updateAccount } from "./services/accounts";
import { getLogger } from "./logger";
import { isMockMode } from "./config";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";
import type { AccountRow } from "./repositories/accounts";
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

export async function dispatchFetch(account: AccountRow, trigger: FetchTrigger = "manual") {
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

    return executeAndRecord(account, runId, trigger);
  } finally {
    activeDispatches.delete(account.id);
  }
}

async function executeAndRecord(
  account: AccountRow,
  runId: number | undefined,
  trigger: FetchTrigger,
) {
  const startedAt = Date.now();
  try {
    const result = await selectFetcher(account)(account) as FetcherResult;
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
