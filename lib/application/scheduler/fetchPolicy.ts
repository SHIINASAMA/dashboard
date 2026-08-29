export type FetchLevel = "l0" | "l1" | "l2";

export const FETCH_POLICY: Record<string, Record<FetchLevel, string>> = {
  github: { l0: "24h", l1: "90m", l2: "8h" },
  gitlab: { l0: "24h", l1: "90m", l2: "8h" },
  twitter: { l0: "24h", l1: "90m", l2: "8h" },
  reddit: { l0: "24h", l1: "90m", l2: "8h" },
};

export const FETCH_LEVEL_META: Record<FetchLevel, { labelKey: string; descriptionKey: string; defaultMs: number }> = {
  l0: { labelKey: "fetchLevel.l0.label", descriptionKey: "fetchLevel.l0.desc", defaultMs: 24 * 60 * 60 * 1000 },
  l1: { labelKey: "fetchLevel.l1.label", descriptionKey: "fetchLevel.l1.desc", defaultMs: 90 * 60 * 1000 },
  l2: { labelKey: "fetchLevel.l2.label", descriptionKey: "fetchLevel.l2.desc", defaultMs: 8 * 60 * 60 * 1000 },
};

export function getFetchInterval(platform: string, level: FetchLevel, override?: number | null): number {
  if (override != null && override > 0) return override * 60 * 1000;
  const policy = FETCH_POLICY[platform]?.[level] ?? (level === "l0" ? "24h" : level === "l1" ? "90m" : "8h");
  if (policy.endsWith("h")) return parseInt(policy, 10) * 60 * 60 * 1000;
  if (policy.endsWith("m")) return parseInt(policy, 10) * 60 * 1000;
  return level === "l0" ? 24 * 60 * 60 * 1000 : level === "l1" ? 90 * 60 * 1000 : 8 * 60 * 60 * 1000;
}

export function formatInterval(minutes: number): string {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)}d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)}h`;
  return `${minutes}m`;
}
