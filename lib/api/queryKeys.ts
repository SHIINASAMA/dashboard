export const queryKeys = {
  pulse: (days: number) => ["pulse", days] as const,
  overview: () => ["overview"] as const,
  timeline: (days: number) => ["timeline", days] as const,
  accounts: () => ["accounts"] as const,
  githubOverview: (accountId: number) => ["github", "overview", accountId] as const,
} as const;
