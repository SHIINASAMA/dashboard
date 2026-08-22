import * as accountsRepo from "../repositories/accounts";
import * as fetchRunsRepo from "../repositories/fetch-runs";
import {
  buildFetchHealth,
  type FetchAccountInput,
  type FetchHealthResponse,
  type FetchRun,
  type FetchRunStatus,
} from "../fetch-health";
import { isMockMode } from "../config";

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function mockRun(
  accountId: number,
  id: number,
  status: FetchRunStatus,
  startedMinutesAgo: number,
  durationMs: number,
  options: { errorMessage?: string | null; capabilityGaps?: FetchRun["capability_gaps"] } = {},
): FetchRun {
  return {
    id,
    account_id: accountId,
    trigger: "scheduler",
    status,
    started_at: minutesAgo(startedMinutesAgo),
    finished_at: status === "running" ? null : minutesAgo(startedMinutesAgo - durationMs / 60_000),
    duration_ms: status === "running" ? null : durationMs,
    error_message: options.errorMessage ?? null,
    capability_gaps: options.capabilityGaps ?? [],
  };
}

function mockRunsFor(account: FetchAccountInput & { platform: string }): FetchRun[] {
  if (account.platform === "github") {
    return [
      mockRun(account.id, -2, "partial", 7, 1_800, {
        capabilityGaps: [{
          capability: "github_traffic",
          message: "No GitHub PAT configured; traffic, referrers, paths, releases, and download counts are unavailable.",
        }],
      }),
      mockRun(account.id, -6, "success", 67, 1_650),
    ];
  }
  if (account.platform === "gitlab") {
    return [
      mockRun(account.id, -3, "failed", 11, 2_100, { errorMessage: "GitLab API 403 for contributions" }),
      mockRun(account.id, -7, "failed", 71, 1_900, { errorMessage: "GitLab API 429: rate limited" }),
    ];
  }
  if (account.platform === "reddit") {
    return [mockRun(account.id, -4, "success", 5, 1_200)];
  }
  return [mockRun(account.id, -1, "success", 3, 900)];
}

export async function getFetchHealth(ownerId?: number): Promise<FetchHealthResponse> {
  const accountRows = await accountsRepo.getAccounts(ownerId);

  if (isMockMode()) {
    const inputs = accountRows.map(({ auth_token: _authToken, ...account }) => account);
    return buildFetchHealth(
      inputs,
      new Map(inputs.map((account) => [account.id, mockRunsFor(account)])),
      new Map(accountRows.filter((account) => account.platform === "gitlab").map((account) => [account.id, 2])),
    );
  }

  const accountIds = accountRows.map((account) => account.id);
  const [runs, failureStreaks] = await Promise.all([
    fetchRunsRepo.getRecentRuns(accountIds),
    fetchRunsRepo.getFailureStreaks(accountIds),
  ]);

  return buildFetchHealth(
    accountRows.map(({ auth_token: _authToken, ...account }) => account),
    runs,
    failureStreaks,
  );
}

export async function getRecentFetchRuns(accountId: number) {
  if (isMockMode()) {
    const account = await accountsRepo.getAccountById(accountId);
    return account ? mockRunsFor(account) : [];
  }
  const runs = await fetchRunsRepo.getRecentRuns([accountId], 10);
  return runs.get(accountId) ?? [];
}
