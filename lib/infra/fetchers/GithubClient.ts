import { fetchWithConfig } from "../../http";

type FetchFn = typeof fetchWithConfig;

function parseLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  // Link: <https://api.github.com/users/alice/repos?page=2>; rel="next", <...>; rel="last"
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

export class GithubClient {
  constructor(private fetchFn: FetchFn = fetchWithConfig) {}


  async fetchUserStats(username: string, token?: string): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "dashboard",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await this.fetchFn(`https://api.github.com/users/${username}`, { headers } as unknown as RequestInit);
    if (!res.ok) throw new Error(`GitHub user ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  }

  async fetchContributions(username: string, token?: string, year?: number): Promise<Array<{ date: string; count: number; level: number }>> {
    const y = year ?? new Date().getFullYear();
    // Use GitHub contributions via old fetcher's GraphQL or REST fallback; for pure new we delegate to existing service
    // Keep compatible: import existing fetchContributions logic lazily
    const mod = await import("../../fetchers/github");
    // @ts-ignore - reuse internal helper if exported, else return empty
    if ((mod as unknown as { fetchContributions?: unknown })["fetchContributions"]) {
      return await (mod as unknown as { fetchContributions: (u:string,t:string|undefined,y:number)=>Promise<Array<{date:string;count:number;level:number}>> }).fetchContributions(username, token, y);
    }
    return [];
  }

  async fetchAllRepos(username: string, token?: string): Promise<unknown[]> {
    let url: string | null = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
    const all: unknown[] = [];
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "dashboard",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    while (url) {
      const res = await this.fetchFn(url, { headers } as unknown as RequestInit);
      if (!res.ok) {
        const body = await res.text?.().catch(() => "") ?? "";
        throw new Error(`GitHub API ${res.status}: ${body.slice(0,200)}`);
      }
      const data = (await res.json()) as unknown[];
      if (Array.isArray(data)) all.push(...(data as unknown[]));
      else all.push(data);
      const link = res.headers?.get?.("link") ?? res.headers?.get?.("Link") ?? null;
      url = parseLink(link);
    }
    return all;
  }

  // TODO: real L2 telemetry (traffic/referrers/paths) not yet migrated into new arch.
  // Placeholders return empty so pure-new L2 is a safe no-op on real accounts.
  async fetchTraffic(_repoFullName: string): Promise<{ clones: { count: number; uniques: number }; views: { count: number; uniques: number } }> {
    return { clones: { count: 0, uniques: 0 }, views: { count: 0, uniques: 0 } };
  }
  async fetchReferrers(_repoFullName: string): Promise<Array<{ referrer: string; count: number; uniques: number }>> {
    return [];
  }
  async fetchPaths(_repoFullName: string): Promise<Array<{ path: string; count: number; uniques: number }>> {
    return [];
  }
}

