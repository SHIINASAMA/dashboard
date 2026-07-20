import { getLogger } from "./logger";

export function fetchWithConfig(url: string, init?: RequestInit & { tls?: { rejectUnauthorized: boolean } }): Promise<Response> {
  return fetch(url, {
    ...init,
    tls: {
      rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED !== "false",
      ...init?.tls,
    },
  } as RequestInit & { tls?: { rejectUnauthorized: boolean } });
}

// Retry only on transport-level failures (undici "fetch failed", connection
// resets, DNS, timeouts). HTTP status errors are NOT retried — the caller
// decides how to handle those. This targets transient network blips (e.g. the
// "fetch failed" errors seen on GitHub/Reddit fetches) without wasting
// attempts on 403/429/404 etc.
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 10_000;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      if (i >= attempts - 1) break; // last attempt → give up
      if (!isTransportError(err)) break; // expected/HTTP error → don't retry
      const wait = (i + 1) * baseMs;
      getLogger().warn(opts.label ?? "HTTP", "request failed (%s), retrying in %ds...", errName(err), wait / 1000);
      await sleep(wait);
    }
  }
  throw lastErr;
}

function isTransportError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.message === "fetch failed") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: string }).code;
    if (code && /^(ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|ECONNABORTED)$/.test(code)) return true;
    if (cause.name === "AbortError") return true;
  }
  if (err.name === "AbortError") return true;
  return false;
}

function errName(err: unknown): string {
  return err instanceof Error ? (err.name || "Error") : "Error";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
