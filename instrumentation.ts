export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrap } = await import("./lib/setup");
    const { loadConfig } = await import("./lib/config");
    const { initLogger } = await import("./lib/logger");
    const { ensureScheduler } = await import("./lib/scheduler-singleton");

    await bootstrap();
    const cfg = loadConfig();
    initLogger(cfg.log);
    ensureScheduler();
  }
}
