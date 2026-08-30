// Real GitLab persistence adapter delegating to the existing gitlab_repositories
// helpers so column semantics stay identical to the legacy path.
import type { GitlabWrite, GitlabProject, GitlabSnapshot, GitlabRelease } from "../../application/usecases/GitlabWrite";

export class GitlabRepoRepository implements GitlabWrite {
  async upsertProject(p: GitlabProject): Promise<void> {
    const { upsertGitlabProject } = await import("../../repositories/gitlab");
    await upsertGitlabProject(p);
  }
  async upsertSnapshot(s: GitlabSnapshot): Promise<void> {
    const { upsertGitlabProjectSnapshot } = await import("../../repositories/gitlab");
    await upsertGitlabProjectSnapshot(s);
  }
  async insertStats(s: { account_id: number; public_projects: number; followers: number; following: number }): Promise<void> {
    const { insertGitlabStats } = await import("../../repositories/gitlab");
    await insertGitlabStats(s);
  }
  async upsertContributions(accountId: number, entries: Array<{ date: string; count: number }>): Promise<void> {
    const { upsertGitlabContributions } = await import("../../repositories/gitlab");
    await upsertGitlabContributions(accountId, entries);
  }
  async upsertRelease(r: GitlabRelease): Promise<void> {
    const { upsertGitlabRelease } = await import("../../repositories/gitlab");
    await upsertGitlabRelease(r);
  }
  async updateAccount(id: number, updates: Record<string, unknown>): Promise<void> {
    const { updateAccount } = await import("../../repositories/accounts");
    await updateAccount(id, updates as never);
  }
}
