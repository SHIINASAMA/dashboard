import { beforeEach, describe, expect, it, vi } from "vitest";

const getActiveAccounts = vi.fn();
const getAccountById = vi.fn();
const fetchAccount = vi.fn();
const fetchGithubAccount = vi.fn();
const fetchGitlabAccount = vi.fn();
const fetchRedditAccount = vi.fn();
const fetchRedditPublicAccount = vi.fn();
const dispatchFetch = vi.fn();

vi.mock("../lib/services/accounts", () => ({
  getActiveAccounts,
  getAccountById,
  updateAccount: vi.fn(),
}));

vi.mock("../lib/fetcher", () => ({
  fetchAccount,
}));

vi.mock("../lib/fetchers/github", () => ({
  fetchGithubAccount,
}));

vi.mock("../lib/fetchers/gitlab", () => ({
  fetchGitlabAccount,
}));

vi.mock("../lib/fetchers/reddit", () => ({
  fetchRedditAccount,
  fetchRedditPublicAccount,
}));

vi.mock("../lib/fetch-dispatch", () => ({
  dispatchFetch,
}));

vi.mock("../lib/logger", () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("scheduler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("skips accounts that were disabled after the active snapshot was loaded", async () => {
    const staleActiveAccount = {
      id: 7,
      owner_id: 1,
      screen_name: "shiinasama2001",
      platform: "twitter",
      user_id: null,
      auth_token: "token",
      fetch_interval: 30,
      is_active: 1,
      last_fetched_at: null,
      error_message: null,
      instance_url: null,
      auth_type: null,
      created_at: "2026-07-05T00:00:00.000Z",
      updated_at: "2026-07-05T00:00:00.000Z",
    };

    getActiveAccounts.mockResolvedValue([staleActiveAccount]);
    getAccountById.mockResolvedValue({ ...staleActiveAccount, is_active: 0 });

    const { runCycleOnceForTests } = await import("../lib/scheduler");
    await runCycleOnceForTests();

    expect(getAccountById).toHaveBeenCalledWith(7);
    expect(fetchAccount).not.toHaveBeenCalled();
  });

  it("dispatches a due account as a scheduler run", async () => {
    const dueAccount = {
      id: 8,
      owner_id: 1,
      screen_name: "due-user",
      platform: "twitter",
      user_id: null,
      auth_token: "token",
      fetch_interval: 30,
      is_active: 1,
      last_fetched_at: new Date(Date.now() - 31 * 60_000).toISOString(),
      error_message: null,
      instance_url: null,
      auth_type: null,
      created_at: "2026-07-05T00:00:00.000Z",
      updated_at: "2026-07-05T00:00:00.000Z",
    };

    getActiveAccounts.mockResolvedValue([dueAccount]);
    getAccountById.mockResolvedValue(dueAccount);
    dispatchFetch.mockResolvedValue({ status: "success" });

    const { runCycleOnceForTests } = await import("../lib/scheduler");
    await runCycleOnceForTests();

    expect(getAccountById).toHaveBeenCalledWith(8);
    expect(dispatchFetch).toHaveBeenCalledWith(dueAccount, "scheduler");
  });

  it("skips active accounts on unsupported platforms", async () => {
    const unsupportedAccount = {
      id: 13,
      owner_id: 1,
      screen_name: "shiinasama2001",
      platform: "medium",
      user_id: null,
      auth_token: "token",
      fetch_interval: 30,
      is_active: 1,
      last_fetched_at: null,
      error_message: null,
      instance_url: null,
      auth_type: null,
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
    };

    getActiveAccounts.mockResolvedValue([unsupportedAccount]);

    const { runCycleOnceForTests } = await import("../lib/scheduler");
    await runCycleOnceForTests();

    expect(getAccountById).not.toHaveBeenCalled();
    expect(dispatchFetch).not.toHaveBeenCalled();
    expect(fetchAccount).not.toHaveBeenCalled();
  });
});
