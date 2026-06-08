import { Hono } from "hono";
import {
  getGithubOverview, getGithubStatsTimeline, getGithubContributions,
  getGithubRepoSnapshots, getGithubTrafficClones, getGithubTrafficViews,
  getGithubReferrers, getGithubPaths, getGithubReleases,
  setPinnedRepos,
} from "../db";

const githubRouter = new Hono();

githubRouter.get("/overview/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = getGithubOverview(accountId);
  if (!data.stats && data.repos.length === 0) {
    return c.json({ error: "No data" }, 404);
  }
  return c.json(data);
});

githubRouter.get("/timeline/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = getGithubStatsTimeline(accountId);
  return c.json(data);
});

githubRouter.get("/contributions/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;
  const data = getGithubContributions(accountId, year);
  return c.json(data);
});

// ─── Repo pinning ──────────────────────────────────────────────

githubRouter.put("/repos/pin", async (c) => {
  const { accountId, repoIds } = await c.req.json() as { accountId: number; repoIds: number[] };
  setPinnedRepos(accountId, repoIds);
  return c.json({ ok: true });
});

// ─── Repo Insights ──────────────────────────────────────────────

githubRouter.get("/:accountId/repos/:repoId/snapshots", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubRepoSnapshots(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/clones", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubTrafficClones(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/views", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubTrafficViews(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/referrers", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubReferrers(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/paths", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubPaths(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/releases", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(getGithubReleases(accountId, repoId));
});

export default githubRouter;
