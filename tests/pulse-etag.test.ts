import { describe, it, expect, vi } from "vitest";

// Mock services before importing route
vi.mock("@/lib/services/accounts", () => ({
  getAccounts: vi.fn(async () => [{ id: 1, screen_name: "alice", platform: "github", owner_id: 1, is_active: 1 }]),
}));
vi.mock("@/lib/services/pulse", () => ({
  getPulse: vi.fn(async () => ({
    range: { days: 7, since: "2026-08-20T00:00:00.000Z", until: "2026-08-27T00:00:00.000Z" },
    totals: { activity: { current: 10, previous: 5, change: 5 }, traction: { stars: { current: 100, previous: 90, change: 10 }, forks: { current: 20, previous: 18, change: 2 } } },
    platforms: [],
    content: { tweets: [], redditPosts: [], redditComments: [] },
    repositories: [],
  })),
}));
vi.mock("@/lib/auth-helpers", () => ({
  requireSession: vi.fn(async () => ({ user: { id: 1, username: "alice", role: "admin" } })),
  getOwnerId: vi.fn(() => undefined),
}));

import { loader } from "../app/api/pulse/route";

describe("GET /api/pulse ETag", () => {
  it("returns 304 on If-None-Match hit", async () => {
    const req1 = new Request("http://test/api/pulse?days=7", { headers: {} });
    const res1 = await loader({ request: req1, params: {}, context: {} } as any);
    const etag = res1.headers.get("ETag");
    expect(etag).toBeTruthy();

    const req2 = new Request("http://test/api/pulse?days=7", { headers: { "If-None-Match": etag! } });
    const res2 = await loader({ request: req2, params: {}, context: {} } as any);
    expect(res2.status).toBe(304);
  });

  it("returns 200 with ETag when no match", async () => {
    const req = new Request("http://test/api/pulse?days=7");
    const res = await loader({ request: req, params: {}, context: {} } as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toBeTruthy();
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
  });
});
