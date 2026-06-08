import { getActiveAccounts } from "./db";
import { fetchAccount } from "./fetcher";

let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (running) return;
  running = true;

  console.log("[Scheduler] Started (checking every 60s)");

  // Run immediately on start
  runCycle();

  intervalId = setInterval(runCycle, 60_000);
}

export function stopScheduler() {
  if (intervalId) clearInterval(intervalId);
  running = false;
  console.log("[Scheduler] Stopped");
}

async function runCycle() {
  try {
    const accounts = getActiveAccounts();
    if (accounts.length === 0) return;

    const now = Date.now();

    for (const account of accounts) {
      const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at).getTime() : 0;
      const intervalMs = (account.fetch_interval || 30) * 60 * 1000;

      if (now - lastFetched >= intervalMs) {
        await fetchAccount(account);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Cycle error:", err);
  }
}
