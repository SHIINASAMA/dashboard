import { loadConfig, isMockMode } from "./config";
import { initLogger } from "./logger";
import { ensureScheduler } from "./scheduler-singleton";

// React Router replacement for the old Next.js startup hook. Next.js used to
// trigger bootstrap/logger/scheduler from this module when NEXT_RUNTIME was
// set; React Router has no equivalent hook, so the server middleware calls
// ensureRuntime() lazily on the first request, once per process.
let runtimeReady = false;

export function ensureRuntime(): void {
  if (runtimeReady) return;
  runtimeReady = true;

  const cfg = loadConfig();
  initLogger(cfg.log);

  // Mock mode serves fixtures: no DB pool and no real API calls, so the
  // background scheduler must not run there.
  if (!isMockMode()) {
    ensureScheduler();
  }
}
