// GitLab new-architecture UseCase: GitlabClient (fetch) -> GitlabWrite (persist),
// inverted so it's testable without a live PG and no legacy fetch-and-write.
import type { Account } from "../../domain/account";
import { GitlabClient } from "../../infra/fetchers/GitlabClient";
import type { GitlabWrite, GitlabProject, GitlabSnapshot } from "./GitlabWrite";
import { getLogger } from "../../logger";
import { validateUpstreamUrl } from "../../ssrf-guard";

function apiBase(account: Account): string {
  const base = (account.instanceUrl || "https://gitlab.com").replace(/\/+$/, "");
  return `${base}/api/v4`;
}

function assertSafeInstanceUrl(account: Account): void {
  const url = (account.instanceUrl || "https://gitlab.com").replace(/\/+$/, "");
  const check = validateUpstreamUrl(url);
  if (!check.ok) {
    throw new Error(`Unsafe GitLab instance URL: ${check.error ?? "rejected"}`);
  }
}

export interface FetcherResultLike {
  status: "success" | "partial";
  capabilityGaps: Array<{ capability: string; message: string }>;
}

export class SyncGitlabAccount {
  private client: GitlabClient;
  private write: GitlabWrite;

  constructor(
    account: Account,
    client?: GitlabClient,
    write?: GitlabWrite,
  ) {
    // Validate before any server-side request can be made to the instance.
    assertSafeInstanceUrl(account);
    this.client = client ?? new GitlabClient(apiBase(account));
    this.write = write ?? undefined as unknown as GitlabWrite; // set lazily below
  }

  private async ensureWrite(): Promise<GitlabWrite> {
    if (this.write) return this.write;
    const { GitlabRepoRepository } = await import("../../infra/drizzle/GitlabRepoRepository");
    this.write = new GitlabRepoRepository();
    return this.write;
  }

  async execute(account: Account): Promise<FetcherResultLike> {
    const logger = getLogger();
    const token = account.authToken ?? "";
    const write = await this.ensureWrite();
    const errors: Array<{ capability: string; message: string }> = [];
    if (!token) logger.warn("GitLab", "@%s: no token — profile/projects may fail", account.screenName);

    // 1) profile + user_id
    const user = await this.client.fetchUser(token);
    if (user?.id) {
      await write.updateAccount(account.id, { user_id: String(user.id) } as unknown as Record<string, unknown>);
    }
    const userId = (user as unknown as { id: number | string }).id;

    // 2) projects + snapshots (L0 static + L1 stars/forks) + releases
    const projects = await this.client.fetchAllProjects(userId, token);
    logger.info("GitLab", "@%s: fetched %d projects", account.screenName, projects.length);
    const today = new Date().toISOString().slice(0, 10);
    let saved = 0;
    for (const p of projects) {
      if (!(p as unknown as { id?: unknown }).id) continue;
      saved++;
      const project: GitlabProject = {
        account_id: account.id,
        project_id: p.id as number,
        name: p.name as string,
        path_with_namespace: (p.path_with_namespace as string) || (p.path as string),
        description: (p.description as string) || null,
        language: (p.language as string) || null,
        stars: (p.star_count as number) ?? 0,
        forks: (p.forks_count as number) ?? 0,
        open_issues: (p.open_issues_count as number) ?? 0,
        topics: JSON.stringify((p.topics as unknown[]) || []),
        homepage: (p.homepage as string) || null,
        is_fork: p.forked_from_project ? 1 : 0,
        visibility: (p.visibility as string) || "public",
        created_at: (p.created_at as string) || null,
        updated_at: (p.updated_at as string) || null,
        last_activity_at: (p.last_activity_at as string) || null,
      };
      await write.upsertProject(project);
      const snapshot: GitlabSnapshot = {
        account_id: account.id, project_id: project.project_id,
        stars: project.stars, forks: project.forks, open_issues: project.open_issues, snapshot_date: today,
      };
      await write.upsertSnapshot(snapshot);

      try {
        const releases = await this.client.fetchReleases(project.project_id, token);
        for (const rel of releases) {
          if (!(rel as unknown as { tag_name?: unknown }).tag_name) continue;
          await write.upsertRelease({
            account_id: account.id, project_id: project.project_id,
            release_tag: rel.tag_name as string, name: (rel.name as string) || null,
            description: (rel.description as string) || null, released_at: (rel.released_at as string) || null,
            created_at: (rel.created_at as string) || null,
          });
        }
      } catch (e) {
        errors.push({ capability: "gitlab_releases", message: e instanceof Error ? e.message : String(e) });
      }
    }

    // 3) stats (accurate project count)
    await write.insertStats({ account_id: account.id, public_projects: projects.length, followers: (user.followers as number) ?? 0, following: (user.following as number) ?? 0 });

    // 4) contributions (best-effort)
    try {
      const events = await this.client.fetchContributionEvents(userId, token);
      const countByDate = new Map<string, number>();
      for (const event of events) {
        const date = (event.created_at as string)?.slice(0, 10);
        if (date) countByDate.set(date, (countByDate.get(date) || 0) + 1);
      }
      await write.upsertContributions(account.id, Array.from(countByDate.entries()).map(([date, count]) => ({ date, count })));
      logger.info("GitLab", "@%s: recorded %d contribution days", account.screenName, countByDate.size);
    } catch (e) {
      errors.push({ capability: "gitlab_contributions", message: e instanceof Error ? e.message : String(e) });
    }

    await write.updateAccount(account.id, { last_fetched_at: new Date().toISOString(), error_message: null } as unknown as Record<string, unknown>);

    logger.info("GitLab", "@%s: done (%d projects, %d gaps)", account.screenName, saved, errors.length);
    return { status: errors.length > 0 ? "partial" : "success", capabilityGaps: errors };
  }
}
