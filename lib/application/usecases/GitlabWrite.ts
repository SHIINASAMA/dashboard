// Port for GitLab persistence, so SyncGitlabAccount stays testable without a live PG.
export interface GitlabProject {
  account_id: number; project_id: number; name: string; path_with_namespace: string;
  description: string | null; language: string | null; stars: number; forks: number;
  open_issues: number; topics: string; homepage: string | null; is_fork: number;
  visibility: string; created_at: string | null; updated_at: string | null; last_activity_at: string | null;
}
export interface GitlabSnapshot { account_id: number; project_id: number; stars: number; forks: number; open_issues: number; snapshot_date: string; }
export interface GitlabRelease { account_id: number; project_id: number; release_tag: string; name: string | null; description: string | null; released_at: string | null; created_at: string | null; }

export interface GitlabWrite {
  upsertProject(p: GitlabProject): Promise<void>;
  upsertSnapshot(s: GitlabSnapshot): Promise<void>;
  insertStats(s: { account_id: number; public_projects: number; followers: number; following: number }): Promise<void>;
  upsertContributions(accountId: number, entries: Array<{ date: string; count: number }>): Promise<void>;
  upsertRelease(r: GitlabRelease): Promise<void>;
  updateAccount(id: number, updates: Record<string, unknown>): Promise<void>;
}
