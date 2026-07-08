import { startScheduler } from "./scheduler";

let started = false;

export function ensureScheduler() {
  if (!started) {
    started = true;
    startScheduler();
  }
}
