import { describe, expect, it } from "vitest";
import { buildFetchHealth, type FetchAccountInput, type FetchRun } from "../lib/fetch-health";

const now = new Date("2026-08-22T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

function account(id: number, overrides: Partial<FetchAccountInput> = {}): FetchAccountInput {
  return {
    id,
    platform: "github",
    screen_name: `user-${id}`,
    fetch_interval: 30,
    is_active: 1,
    last_fetched_at: null,
    ...overrides,
  };
}

function run(id: number, accountId: number, status: FetchRun["status"], startedMinutesAgo: number): FetchRun {
  return {
    id,
    account_id: accountId,
    trigger: "scheduler",
    status,
    started_at: minutesAgo(startedMinutesAgo),
    finished_at: status === "running" ? null : minutesAgo(startedMinutesAgo - 1),
    duration_ms: status === "running" ? null : 60_000,
    error_message: status === "failed" ? "API failed" : null,
    capability_gaps: status === "partial" && accountId === 3
      ? [{ capability: "github_traffic", message: "PAT needs repo scope" }]
      : [],
  };
}

describe("fetch health aggregation", () => {
  it("classifies account state and orders actionable issues first", () => {
    const accounts = [
      account(1, { last_fetched_at: minutesAgo(5) }),
      account(2),
      account(3, { platform: "gitlab", screen_name: "alpha" }),
      account(4),
    ];
    const runs = new Map<number, FetchRun[]>([
      [1, [run(11, 1, "success", 5)]],
      [2, [run(21, 2, "failed", 10)]],
      [3, [run(31, 3, "partial", 8)]],
      [4, [run(41, 4, "success", 90)]],
    ]);
    const failures = new Map([[2, 2]]);

    const health = buildFetchHealth(accounts, runs, failures, now);

    expect(health.summary).toEqual({
      totalAccounts: 4,
      activeAccounts: 4,
      healthy: 1,
      stale: 1,
      partial: 0,
      failed: 1,
      capabilityGap: 1,
      running: 0,
    });
    expect(health.accounts.map((item) => item.status)).toEqual([
      "healthy",
      "failed",
      "capability_gap",
      "stale",
    ]);
    expect(health.issues.map((item) => item.status)).toEqual([
      "failed",
      "capability_gap",
      "stale",
    ]);
    expect(health.accounts[1].consecutiveFailures).toBe(2);
    expect(health.accounts[2].capabilityGaps[0].message).toBe("PAT needs repo scope");
    expect(health.accounts[3].nextDueAt).toBe(new Date(now.getTime() - 60 * 60_000).toISOString());
  });

  it("excludes unsupported platforms from health stats but reports them separately", () => {
    const accounts = [
      account(1, { last_fetched_at: minutesAgo(5) }),
      account(5, { platform: "cloudflare", screen_name: "shiinalabs.com", last_fetched_at: minutesAgo(5) }),
      account(6, { platform: "medium", screen_name: "shiinasama2001", last_fetched_at: minutesAgo(7) }),
    ];

    const health = buildFetchHealth(accounts, new Map(), new Map(), now);

    expect(health.summary).toEqual({
      totalAccounts: 1,
      activeAccounts: 1,
      stale: 0,
      healthy: 1,
      partial: 0,
      failed: 0,
      capabilityGap: 0,
      running: 0,
    });
    expect(health.accounts.map((item) => item.accountId)).toEqual([1]);
    expect(health.issues).toEqual([]);
    expect(health.unsupportedAccounts).toEqual([
      { accountId: 5, platform: "cloudflare", screenName: "shiinalabs.com" },
      { accountId: 6, platform: "medium", screenName: "shiinasama2001" },
    ]);
  });
});
