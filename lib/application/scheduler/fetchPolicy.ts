export type FetchLevel = "l0" | "l1" | "l2";

export const FETCH_POLICY: Record<string, Record<FetchLevel, string>> = {
  github: { l0: "24h", l1: "90m", l2: "8h" },
  gitlab: { l0: "24h", l1: "90min", l2: "8h" },
  twitter: { l0: "24h", l1: "90min", l2: "8h" },
  reddit: { l0: "24h", l1: "90min", l2: "8h" },
};

export function getFetchInterval(platform: string, level: FetchLevel, override?: number): number {
  if (override) return override * 60 * 1000;
  const policy = FETCH_POLICY[platform]?.[level] ?? "24h";
  if (policy.endsWith("h")) return parseInt(policy) * 60 * 60 * 1000;
  if (policy.endsWith("m")) return parseInt(policy) * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}
