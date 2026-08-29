export type Platform = "github" | "gitlab" | "twitter" | "reddit";
export type FetchLevel = "l0" | "l1" | "l2";

export interface Account {
  id: number;
  screenName: string;
  platform: Platform;
  ownerId: number;
  instanceUrl: string | null;
  /** Legacy single override (minutes) — now ignored, system auto */
  fetchIntervalOverride?: number | null;
  /** Per-level overrides (minutes), null = use platform policy */
  fetchIntervals?: Partial<Record<FetchLevel, number | null>>;
  isActive: number;
}
