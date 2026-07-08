import { ensureScheduler } from "./scheduler-singleton";
import { bootstrap } from "./setup";
import { loadConfig } from "./config";
import { initLogger } from "./logger";

// Top-level await — runs once when module is first imported
await bootstrap();
const cfg = loadConfig();
initLogger(cfg.log);
ensureScheduler();
