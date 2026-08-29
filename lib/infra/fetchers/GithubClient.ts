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
}
