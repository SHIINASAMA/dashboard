import { getActiveAccounts } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";

let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function startScheduler() {
  if (running) return;
  running = true;
  console.log("[Scheduler] Started (checking every 60s)");
  // Don't run immediately on startup — wait for the first real interval tick.
  // This prevents hammering APIs with every restart when accounts are already
  // within their fetch interval.
  const firstRunMs = 60_000 + Math.random() * 30_000; // 60–90s jitter on cold start
  timeoutId = setTimeout(() => {
    runCycle();
    intervalId = setInterval(runCycle, 60_000);
  }, firstRunMs);
}

export function stopScheduler() {
  if (timeoutId) clearTimeout(timeoutId);
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
      } else if (account.platform === "reddit") {
        if (account.auth_type === "reddit_public") {
          await fetchRedditPublicAccount(account);
        } else {
          await fetchRedditAccount(account);
        }
      } else {
        await fetchAccount(account);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Cycle error:", err);
  }
}
