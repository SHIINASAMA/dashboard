import { useSyncExternalStore } from "react";

let listeners: Array<() => void> = [];
let now = Date.now();

function emitChange() {
  now = Date.now();
  for (const listener of listeners) listener();
}

setInterval(emitChange, 60_000);

export function useNow(): number {
  return useSyncExternalStore(
    (callback) => {
      listeners = [...listeners, callback];
      return () => {
        listeners = listeners.filter((l) => l !== callback);
      };
    },
    () => now,
    () => Date.now(),
  );
}
