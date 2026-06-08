import { getActiveAccounts } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";

let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (running) return;
  running = true;
  console.log("[Scheduler] Started (checking every 60s)");
  runCycle();
  intervalId = setInterval(runCycle, 60_000);
}

export function stopScheduler() {
  if (intervalId) clearInterval(intervalId);
  running = false;
}

async function runCycle() {
  try {
    const accounts = getActiveAccounts();
    if (accounts.length === 0) return;
    const now = Date.now();

    for (const account of accounts) {
      const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at).getTime() : 0;
      const intervalMs = (account.fetch_interval || 30) * 60 * 1000;
      if (now - lastFetched < intervalMs) continue;

      if (account.platform === "github") {
        await fetchGithubAccount(account);
      } else if (account.platform === "gitlab") {
        await fetchGitlabAccount(account);
      } else {
        await fetchAccount(account);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Cycle error:", err);
  }
}
