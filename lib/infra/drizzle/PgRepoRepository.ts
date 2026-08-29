/* eslint-disable @typescript-eslint/no-unused-vars */
import type { RepoRepository } from "../../domain/ports";
import type { Repo } from "../../domain/repo";
import type { RepoSnapshot } from "../../domain/snapshot";

export class PgRepoRepository implements RepoRepository {
  constructor(private db: unknown) {}

  async findAllByAccountIds(ids: number[]): Promise<Repo[]> {
    // Skeleton: returns empty, real implementation will query github_repos + gitlab_projects
    return [];
  }

  async findSnapshotsBefore(ids: number[], sinceDay: string): Promise<Map<string, RepoSnapshot>> {
    return new Map();
  }

  async findSnapshotsInWindow(ids: number[], sinceDay: string, untilDay: string): Promise<Map<string, RepoSnapshot>> {
    return new Map();
  }

  async upsertRepos(_repos: Repo[]): Promise<void> {
    // TODO: implement via Drizzle
  }

  async upsertSnapshots(_snapshots: RepoSnapshot[]): Promise<void> {
    // TODO
  }
}
