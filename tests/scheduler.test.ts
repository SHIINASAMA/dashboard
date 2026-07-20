import { beforeEach, describe, expect, it, vi } from "vitest";

const getActiveAccounts = vi.fn();
const getAccountById = vi.fn();
const fetchAccount = vi.fn();
const fetchGithubAccount = vi.fn();
const fetchGitlabAccount = vi.fn();
const fetchRedditAccount = vi.fn();
const fetchRedditPublicAccount = vi.fn();

vi.mock("../services/accounts", () => ({
  getActiveAccounts,
  getAccountById,
}));

vi.mock("../fetcher", () => ({
  fetchAccount,
}));

vi.mock("../fetchers/github", () => ({
  fetchGithubAccount,
}));

vi.mock("../fetchers/gitlab", () => ({
  fetchGitlabAccount,
}));

vi.mock("../fetchers/reddit", () => ({
  fetchRedditAccount,
  fetchRedditPublicAccount,
}));

vi.mock("../logger", () => ({
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
});
