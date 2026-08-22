import { isSupportedPlatform } from "./platforms";

export type FetchRunStatus = "running" | "success" | "partial" | "failed";
export type FetchTrigger = "manual" | "scheduler";
export type FetchAccountHealthStatus =
  | "healthy"
  | "running"
  | "partial"
  | "failed"
  | "stale"
  | "capability_gap";

export interface CapabilityGap {
  capability: string;
  message?: string;
}

export interface FetchRun {
  id: number;
  account_id: number;
  trigger: FetchTrigger;
  status: FetchRunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  capability_gaps: CapabilityGap[];
}

export interface FetchAccountInput {
  id: number;
  platform: string;
  screen_name: string;
  fetch_interval: number | null;
  is_active: number | null;
  last_fetched_at: string | null;
}

export interface FetchAccountHealth {
  accountId: number;
  platform: string;
  screenName: string;
  isActive: boolean;
  status: FetchAccountHealthStatus;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  nextDueAt: string | null;
  consecutiveFailures: number;
  latestError: string | null;
  capabilityGaps: CapabilityGap[];
  recentRuns: FetchRun[];
}

export interface FetchHealthSummary {
  totalAccounts: number;
  activeAccounts: number;
  healthy: number;
  stale: number;
  partial: number;
  failed: number;
  capabilityGap: number;
  running: number;
}

export interface FetchHealthResponse {
  summary: FetchHealthSummary;
  accounts: FetchAccountHealth[];
  issues: FetchAccountHealth[];
  unsupportedAccounts: Array<{
    accountId: number;
    platform: string;
    screenName: string;
  }>;
}

interface RunRow {
  id: number;
  account_id: number;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  capability_gaps: string;
}

function parseCapabilityGaps(value: string): CapabilityGap[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CapabilityGap => (
      typeof item === "object" && item !== null && typeof (item as CapabilityGap).capability === "string"
    ));
  } catch {
    return [];
  }
}

export function toFetchRun(row: RunRow): FetchRun {
  return {
    id: row.id,
    account_id: row.account_id,
    trigger: row.trigger === "scheduler" ? "scheduler" : "manual",
    status: row.status === "success" || row.status === "partial" || row.status === "failed"
      ? row.status
      : "running",
    started_at: row.started_at,
    finished_at: row.finished_at,
    duration_ms: row.duration_ms,
    error_message: row.error_message,
    capability_gaps: parseCapabilityGaps(row.capability_gaps),
  };
}

export function buildFetchHealth(
  accounts: FetchAccountInput[],
  runsByAccount: Map<number, FetchRun[]>,
  failureStreaks: Map<number, number>,
  now = new Date(),
): FetchHealthResponse {
  const supportedAccounts = accounts.filter((account) => isSupportedPlatform(account.platform));
  const unsupportedAccounts = accounts
    .filter((account) => !isSupportedPlatform(account.platform))
    .map((account) => ({
      accountId: account.id,
      platform: account.platform,
      screenName: account.screen_name,
    }));

  const accountHealth = supportedAccounts.map((account) => {
    const runs = runsByAccount.get(account.id) ?? [];
    const latest = runs[0];
    const latestCompleted = runs.find((run) => run.status !== "running");
    const lastSuccess = runs.find((run) => run.status === "success" || run.status === "partial");
    const referenceAt = latest?.started_at ?? account.last_fetched_at;
    const referenceMs = referenceAt ? new Date(referenceAt).getTime() : 0;
    const intervalMs = Math.max(1, account.fetch_interval || 30) * 60_000;
    const isStale = !referenceMs || now.getTime() - referenceMs > intervalMs;
    const hasCapabilityGap = Boolean(latestCompleted?.capability_gaps.length);

    let status: FetchAccountHealthStatus;
    if (!account.is_active) status = "stale";
    else if (latest?.status === "running") status = "running";
    else if (latestCompleted?.status === "failed") status = "failed";
    else if (hasCapabilityGap) status = "capability_gap";
    else if (latestCompleted?.status === "partial") status = "partial";
    else if (isStale) status = "stale";
    else status = "healthy";

    return {
      accountId: account.id,
      platform: account.platform,
      screenName: account.screen_name,
      isActive: account.is_active === 1,
      status,
      lastAttemptAt: latest?.started_at ?? account.last_fetched_at,
      lastSuccessAt: lastSuccess?.finished_at ?? null,
      nextDueAt: referenceMs ? new Date(referenceMs + intervalMs).toISOString() : null,
      consecutiveFailures: failureStreaks.get(account.id) ?? 0,
      latestError: latestCompleted?.error_message ?? null,
      capabilityGaps: latestCompleted?.capability_gaps ?? [],
      recentRuns: runs.slice(0, 5),
    };
  });

  const active = accountHealth.filter((account) => account.isActive);
  const summary: FetchHealthSummary = {
    totalAccounts: accountHealth.length,
    activeAccounts: active.length,
    healthy: active.filter((a) => a.status === "healthy").length,
    stale: active.filter((a) => a.status === "stale").length,
    partial: active.filter((a) => a.status === "partial").length,
    failed: active.filter((a) => a.status === "failed").length,
    capabilityGap: active.filter((a) => a.status === "capability_gap").length,
    running: active.filter((a) => a.status === "running").length,
  };

  const severity: Record<FetchAccountHealthStatus, number> = {
    failed: 0,
    capability_gap: 1,
    partial: 2,
    stale: 3,
    running: 4,
    healthy: 5,
  };
  const issues = accountHealth
    .filter((account) => account.isActive && account.status !== "healthy")
    .sort((left, right) => severity[left.status] - severity[right.status]
      || left.screenName.localeCompare(right.screenName));

  return { summary, accounts: accountHealth, issues, unsupportedAccounts };
}
