import { getActiveAccounts } from "./services/accounts";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";
import { getLogger } from "./logger";

let running = false;
let cycleRunning = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

// Minimum seconds between fetching two accounts of the same platform.
// Prevents hammering a single API with back-to-back full-profile fetches.
const PLATFORM_COOLDOWN_MS: Record<string, number> = {
  github: 120_000,
  gitlab: 120_000,
  twitter: 300_000,  // X rate limits are the strictest
  reddit: 120_000,
};

const CYCLE_INTERVAL_MS = 60_000;

export function startScheduler() {
  if (running) return;
  running = true;
  getLogger().info("Scheduler", "Started (checking every %ds)", CYCLE_INTERVAL_MS / 1000);
  scheduleNext();
}

export function stopScheduler() {
  if (timeoutId) clearTimeout(timeoutId);
  running = false;
}

function scheduleNext() {
  if (!running) return;
  // Add jitter to prevent alignment across restarts
  const jitter = Math.random() * 10_000; // 0–10s
  timeoutId = setTimeout(() => {
    runCycle().finally(() => scheduleNext());
  }, CYCLE_INTERVAL_MS + jitter);
}

async function runCycle() {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    const accounts = await getActiveAccounts();
    if (accounts.length === 0) return;
    let now = Date.now();
    const lastPlatformFetch = new Map<string, number>();

    for (const account of accounts) {
      const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at).getTime() : 0;
      const intervalMs = (account.fetch_interval || 30) * 60 * 1000;
      if (now - lastFetched < intervalMs) continue;

      const platform = account.platform;
      const platformLast = lastPlatformFetch.get(platform) || 0;
      const cooldown = PLATFORM_COOLDOWN_MS[platform] || 0;
      const elapsed = now - platformLast;
      if (elapsed < cooldown) {
        await sleep(cooldown - elapsed);
      }

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

      lastPlatformFetch.set(platform, Date.now());
      // Refresh now after each fetch so the interval check reflects real elapsed time
      now = Date.now();
    }
  } catch (err) {
    getLogger().error("Scheduler", "Cycle error: %s", err instanceof Error ? err.message : String(err));
  } finally {
    cycleRunning = false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
