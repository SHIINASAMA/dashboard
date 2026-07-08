import { afterEach, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { initLogger } from "../lib/logger";

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    chmodSync(dir, 0o755);
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("logger", () => {
  it("does not throw when log directory is not writable", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashboard-logger-"));
    cleanupDirs.push(dir);
    chmodSync(dir, 0o555);

    const logger = initLogger({
      dir,
      level: "info",
      maxSize: "10m",
      maxFiles: 5,
    });

    expect(() => logger.info("Test", "message")).not.toThrow();
  });
});
