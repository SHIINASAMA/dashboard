import { describe, expect, it } from "vitest";
import {
  buildIssueSplitQuery,
  parseIssueSplitResponse,
} from "../lib/fetchers/github-issue-split";

describe("GitHub Issue split helpers", () => {
  const repos = [
    { id: 10, full_name: "owner/one" },
    { id: 20, full_name: "other/two" },
  ];

  it("builds one aliased query per repository", () => {
    const query = buildIssueSplitQuery(repos);

    expect(query).toContain('r0: repository(owner: "owner", name: "one")');
    expect(query).toContain('r1: repository(owner: "other", name: "two")');
    expect(query.match(/issues\(states: OPEN\)/g)).toHaveLength(2);
    expect(query.match(/pullRequests\(states: OPEN\)/g)).toHaveLength(2);
  });

  it("rejects malformed full names before sending a request", () => {
    expect(() => buildIssueSplitQuery([{ id: 1, full_name: "invalid" }])).toThrow(
      "Invalid repository full name: invalid",
    );
  });

  it("maps GraphQL nodes back to repository IDs", () => {
    const result = parseIssueSplitResponse(repos, {
      r0: { issues: { totalCount: 3 }, pullRequests: { totalCount: 4 } },
      r1: { issues: { totalCount: 0 }, pullRequests: { totalCount: 9 } },
    });

    expect(result.get(10)).toEqual({ issues: 3, pullRequests: 4 });
    expect(result.get(20)).toEqual({ issues: 0, pullRequests: 9 });
  });

  it("treats missing counts as an error rather than zero", () => {
    expect(() => parseIssueSplitResponse([repos[0]], {
      r0: { issues: { totalCount: 1 } },
    })).toThrow("GitHub Issue split is missing Pull Requests for owner/one");
  });
});
