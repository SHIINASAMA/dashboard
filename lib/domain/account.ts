export type Platform = "github" | "gitlab" | "twitter" | "reddit";

export interface Account {
  id: number;
  screenName: string;
  platform: Platform;
  ownerId: number;
  instanceUrl: string | null;
  fetchIntervalOverride?: number | null;
  isActive: number;
}
