import { ensureScheduler } from "./scheduler-singleton";
import { bootstrap } from "./setup";
import { loadConfig } from "./config";
import { initLogger } from "./logger";

// Only run startup at runtime, not during build
// NEXT_RUNTIME is "nodejs" when running server-side at runtime
if (process.env.NEXT_RUNTIME === "nodejs") {
  await bootstrap();
  const cfg = loadConfig();
  initLogger(cfg.log);
  ensureScheduler();
}
