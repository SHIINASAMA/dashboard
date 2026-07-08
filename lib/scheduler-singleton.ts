import { startScheduler } from "./scheduler";

const g = globalThis as unknown as { __schedulerStarted?: boolean };

export function ensureScheduler() {
  if (!g.__schedulerStarted) {
    g.__schedulerStarted = true;
    startScheduler();
  }
}
