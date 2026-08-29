import type { RepoRepository } from "../../domain/ports";
import type { Repo } from "../../domain/repo";
import { Stars, Forks } from "../../domain/repo";
import type { RepoSnapshot } from "../../domain/snapshot";
import { getDb } from "../../db/connection";
import { github_repos, github_repo_snapshots, gitlab_projects, gitlab_project_snapshots } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";

function toDomainRepo(row: Record<string, unknown>, accountId: number): Repo {
  return {
    accountId,
    repoId: (row.repo_id as number) ?? (row.project_id as number),
    name: row.name as string,
    fullName: (row.full_name as string) ?? (row.path_with_namespace as string) ?? (row.name as string),
    stars: new Stars((row.stars as number) ?? 0),
    forks: new Forks((row.forks as number) ?? 0),
    isFork: (row.is_fork as number) ?? 0,
    language: (row.language as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    homepage: (row.homepage as string | null) ?? null,
    topics: (row.topics as string) ?? "[]",
  };
}

export class PgRepoRepository implements RepoRepository {
  // Allow injecting db for tests; fallback to global getDb()
  constructor(private db?: ReturnType<typeof getDb>) {}

  private get dbInstance(): ReturnType<typeof getDb> | null {
    if (this.db === null) return null as unknown as ReturnType<typeof getDb>;
    return (this.db as ReturnType<typeof getDb>) ?? getDb();
  }

  async findAllByAccountIds(ids: number[]): Promise<Repo[]> {
    if (ids.length === 0) return [];
    const db = this.dbInstance;
    if (!db) return [];
    // Query both GitHub and GitLab in parallel — compatible with existing schema
    const [githubRows, gitlabRows] = await Promise.all([
      db.select().from(github_repos).where(inArray(github_repos.account_id, ids)),
      db.select().from(gitlab_projects).where(inArray(gitlab_projects.account_id, ids)),
    ]);
    const repos: Repo[] = [];
    for (const r of githubRows) repos.push(toDomainRepo(r as unknown as Record<string, unknown>, (r as unknown as { account_id: number }).account_id));
    for (const r of gitlabRows) repos.push(toDomainRepo(r as unknown as Record<string, unknown>, (r as unknown as { account_id: number }).account_id));
    return repos;
  }

  async findSnapshotsBefore(ids: number[], sinceDay: string): Promise<Map<string, RepoSnapshot>> {
    if (ids.length === 0) return new Map();
    const db = this.dbInstance;
    if (!db) return new Map();
    // Latest snapshot strictly before sinceDay per (account_id, repo_id)
    const result = new Map<string, RepoSnapshot>();
    const [gh, gl] = await Promise.all([
      db.execute(sql`SELECT DISTINCT ON (account_id, repo_id) account_id, repo_id, stars, forks, snapshot_date FROM ${github_repo_snapshots} WHERE account_id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)}) AND snapshot_date < ${sinceDay} ORDER BY account_id, repo_id, snapshot_date DESC`),
      db.execute(sql`SELECT DISTINCT ON (account_id, project_id) account_id, project_id as repo_id, stars, forks, snapshot_date FROM ${gitlab_project_snapshots} WHERE account_id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)}) AND snapshot_date < ${sinceDay} ORDER BY account_id, project_id, snapshot_date DESC`),
    ]);
    for (const row of (gh as unknown as { rows: Array<{ account_id: number; repo_id: number; stars: number; forks: number; snapshot_date: string }> }).rows ?? []) {
      const key = `${row.account_id}:${row.repo_id}`;
      result.set(key, { accountId: row.account_id, repoId: row.repo_id, stars: row.stars, forks: row.forks, snapshotDate: row.snapshot_date });
    }
    for (const row of (gl as unknown as { rows: Array<{ account_id: number; repo_id: number; stars: number; forks: number; snapshot_date: string }> }).rows ?? []) {
      const key = `${row.account_id}:${row.repo_id}`;
      if (!result.has(key)) result.set(key, { accountId: row.account_id, repoId: row.repo_id, stars: row.stars, forks: row.forks, snapshotDate: row.snapshot_date });
    }
    return result;
  }

  async findSnapshotsInWindow(ids: number[], sinceDay: string, untilDay: string): Promise<Map<string, RepoSnapshot>> {
    if (ids.length === 0) return new Map();
    const db = this.dbInstance;
    if (!db) return new Map();
    const result = new Map<string, RepoSnapshot>();
    const [gh, gl] = await Promise.all([
      db.execute(sql`SELECT DISTINCT ON (account_id, repo_id) account_id, repo_id, stars, forks, snapshot_date FROM ${github_repo_snapshots} WHERE account_id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)}) AND snapshot_date >= ${sinceDay} AND snapshot_date <= ${untilDay} ORDER BY account_id, repo_id, snapshot_date DESC`),
      db.execute(sql`SELECT DISTINCT ON (account_id, project_id) account_id, project_id as repo_id, stars, forks, snapshot_date FROM ${gitlab_project_snapshots} WHERE account_id = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)}) AND snapshot_date >= ${sinceDay} AND snapshot_date <= ${untilDay} ORDER BY account_id, project_id, snapshot_date DESC`),
    ]);
    for (const row of (gh as unknown as { rows: Array<{ account_id: number; repo_id: number; stars: number; forks: number; snapshot_date: string }> }).rows ?? []) {
      const key = `${row.account_id}:${row.repo_id}`;
      result.set(key, { accountId: row.account_id, repoId: row.repo_id, stars: row.stars, forks: row.forks, snapshotDate: row.snapshot_date });
    }
    for (const row of (gl as unknown as { rows: Array<{ account_id: number; repo_id: number; stars: number; forks: number; snapshot_date: string }> }).rows ?? []) {
      const key = `${row.account_id}:${row.repo_id}`;
      if (!result.has(key)) result.set(key, { accountId: row.account_id, repoId: row.repo_id, stars: row.stars, forks: row.forks, snapshotDate: row.snapshot_date });
    }
    return result;
  }

  async upsertRepos(repos: Repo[]): Promise<void> {
    if (repos.length === 0) return;
    const { upsertGithubRepo } = await import("../../repositories/github");
    const { getDb } = await import("../../db/connection");
    const { github_repos } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    for (const repo of repos) {
      // L0 static objects may not carry stars/forks — keep existing values for compatibility
      let starsVal: number | undefined = (repo as unknown as { stars?: { value: number } }).stars?.value;
      let forksVal: number | undefined = (repo as unknown as { forks?: { value: number } }).forks?.value;
      if (starsVal === undefined || forksVal === undefined) {
        try {
          const db = getDb();
          const [existing] = await db.select({ stars: github_repos.stars, forks: github_repos.forks }).from(github_repos).where(and(eq(github_repos.account_id, repo.accountId), eq(github_repos.repo_id, repo.repoId))).limit(1);
          if (existing) {
            if (starsVal === undefined) starsVal = existing.stars ?? 0;
            if (forksVal === undefined) forksVal = existing.forks ?? 0;
          } else {
            starsVal = starsVal ?? 0;
            forksVal = forksVal ?? 0;
          }
        } catch {
          starsVal = starsVal ?? 0;
          forksVal = forksVal ?? 0;
        }
      }
      await upsertGithubRepo({
        account_id: repo.accountId,
        repo_id: repo.repoId,
        name: repo.name,
        full_name: repo.fullName,
        description: repo.description,
        language: repo.language,
        stars: starsVal,
        forks: forksVal,
        open_issues: 0,
        topics: repo.topics,
        homepage: repo.homepage,
        is_fork: repo.isFork,
        created_at: null,
        updated_at: null,
        pushed_at: null,
      });
    }
  }

  async upsertSnapshots(snapshots: RepoSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;
    const { upsertGithubRepoSnapshot } = await import("../../repositories/github");
    for (const s of snapshots) {
      await upsertGithubRepoSnapshot({
        account_id: s.accountId,
        repo_id: s.repoId,
        stars: s.stars,
        forks: s.forks,
        open_issues: 0,
        snapshot_date: s.snapshotDate,
      });
    }
  }
}
