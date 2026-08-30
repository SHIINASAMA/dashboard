import { initLogger } from "../lib/logger";

// Vitest global setup: initialize the logger so pure-new usecases that call
// getLogger() (GithubFetcher / SyncRepoMeta / SyncActivity) don't hard-fail
// in unit tests that don't bootstrap the full app.
initLogger({ dir: "/tmp", level: "error", maxSize: "1m", maxFiles: 1 });
