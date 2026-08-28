import { fetchWithConfig, withNetworkRetry } from "../http";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";
const ISSUE_SPLIT_CHUNK_SIZE = 40;

export interface IssueSplitRepository {
  id: number;
  full_name: string;
}

export interface IssueSplitCount {
  issues: number;
  pullRequests: number;
}

export function buildIssueSplitQuery(repos: IssueSplitRepository[]): string {
  if (repos.length === 0) return "query { __typename }";

  const fields = repos.map((repo, index) => {
    const [owner, name] = repo.full_name.split("/");
    if (!owner || !name || repo.full_name.split("/").length !== 2) {
      throw new Error(`Invalid repository full name: ${repo.full_name}`);
    }

    // JSON.stringify produces a valid GraphQL string literal, including escapes.
    return [
      `r${index}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)})`,
      "{ issues(states: OPEN) { totalCount } pullRequests(states: OPEN) { totalCount } }",
    ].join(" ");
  });

  return `query { ${fields.join(" ")} }`;
}

export function parseIssueSplitResponse(
  repos: IssueSplitRepository[],
  data: unknown,
): Map<number, IssueSplitCount> {
  if (typeof data !== "object" || data === null) {
    throw new Error("GitHub Issue split response has no data");
  }

  const values = data as Record<string, unknown>;
  const result = new Map<number, IssueSplitCount>();

  repos.forEach((repo, index) => {
    const node = values[`r${index}`];
    if (typeof node !== "object" || node === null) {
      return; // skip repos GitHub cannot resolve (private, deleted, renamed)
    }

    const counts = node as Record<string, unknown>;
    if (!counts.issues || !counts.pullRequests) return;
    result.set(repo.id, {
      issues: readTotalCount(counts.issues, `Issues for ${repo.full_name}`),
      pullRequests: readTotalCount(counts.pullRequests, `Pull Requests for ${repo.full_name}`),
    });
  });

  return result;
}

function readTotalCount(value: unknown, label: string): number {
  if (typeof value !== "object" || value === null) {
    throw new Error(`GitHub Issue split is missing ${label}`);
  }
  const count = (value as Record<string, unknown>).totalCount;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error(`GitHub Issue split returned an invalid count for ${label}`);
  }
  return count;
}

export async function fetchGithubIssueSplits(
  repos: IssueSplitRepository[],
  token: string,
): Promise<Map<number, IssueSplitCount>> {
  if (!token) {
    throw new Error("A GitHub PAT is required to separate Issues from Pull Requests");
  }

  const result = new Map<number, IssueSplitCount>();
  for (let offset = 0; offset < repos.length; offset += ISSUE_SPLIT_CHUNK_SIZE) {
    const chunk = repos.slice(offset, offset + ISSUE_SPLIT_CHUNK_SIZE);
    const query = buildIssueSplitQuery(chunk);
    const data = await requestIssueSplitQuery(query, token);
    for (const [repoId, counts] of parseIssueSplitResponse(chunk, data)) {
      result.set(repoId, counts);
    }
    if (offset + ISSUE_SPLIT_CHUNK_SIZE < repos.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return result;
}

async function requestIssueSplitQuery(query: string, token: string): Promise<unknown> {
  const res = await withNetworkRetry(
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        return await fetchWithConfig(GITHUB_GRAPHQL_API, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "dashboard",
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    },
    { label: "GitHub" },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub GraphQL ${res.status}: ${detail.slice(0, 200)}`);
  }

  const body = await res.json().catch(() => null) as
    | { data?: unknown; errors?: Array<{ message?: string }> }
    | null;
  if (!body) {
    throw new Error("GitHub GraphQL returned an invalid response");
  }
  if (body.errors?.length && !body.data) {
    throw new Error(body.errors[0].message || "GitHub GraphQL request failed");
  }
  return body.data;
}
