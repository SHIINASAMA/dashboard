import type { Account } from "./account";
import type { Repo } from "./repo";
import type { RepoSnapshot } from "./snapshot";

export interface RepoRepository {
  findAllByAccountIds(ids: number[]): Promise<Repo[]>;
  findSnapshotsBefore(ids: number[], sinceDay: string): Promise<Map<string, RepoSnapshot>>;
  findSnapshotsInWindow(ids: number[], sinceDay: string, untilDay: string): Promise<Map<string, RepoSnapshot>>;
  upsertRepos(repos: Repo[]): Promise<void>;
  upsertSnapshots(snapshots: RepoSnapshot[]): Promise<void>;
}

export interface StatsRepository {
  findLatest(accountId: number): Promise<{ followers: number } | null>;
}

export interface RepoFetchedEvent {
  type: "RepoMetaFetched";
  repo: Repo;
}

export interface FetcherPort {
  fetchRepoMeta(account: Account): Promise<RepoFetchedEvent[]>;
}

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date { return new Date(); }
}
