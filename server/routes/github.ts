import { Hono } from "hono";
import {
  getGithubOverview, getGithubStatsTimeline, getGithubContributions,
  getGithubRepoSnapshots, getGithubTrafficClones, getGithubTrafficViews,
  getGithubReferrers, getGithubPaths, getGithubReleases,
  getGithubReferrerHistory, getGithubPathHistory,
  setPinnedRepos,
} from "../db";

const githubRouter = new Hono();

githubRouter.get("/overview/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await getGithubOverview(accountId);
  if (!data.stats && data.repos.length === 0) {
    return c.json({ error: "No data" }, 404);
  }
  return c.json(data);
});

githubRouter.get("/timeline/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await getGithubStatsTimeline(accountId);
  return c.json(data);
});

githubRouter.get("/contributions/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;
  const data = await getGithubContributions(accountId, year);
  return c.json(data);
});

// ─── Repo pinning ──────────────────────────────────────────────

githubRouter.put("/repos/pin", async (c) => {
  const { accountId, repoIds } = await c.req.json() as { accountId: number; repoIds: number[] };
  await setPinnedRepos(accountId, repoIds);
  return c.json({ ok: true });
});

// ─── Repo Insights ──────────────────────────────────────────────

githubRouter.get("/:accountId/repos/:repoId/snapshots", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubRepoSnapshots(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/clones", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubTrafficClones(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/views", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubTrafficViews(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/referrers", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubReferrers(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/referrers/history", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubReferrerHistory(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/paths", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubPaths(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/paths/history", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubPathHistory(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/releases", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await getGithubReleases(accountId, repoId));
});

export default githubRouter;
