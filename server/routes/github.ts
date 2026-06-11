import { Hono } from "hono";
import * as githubRepo from "../repositories/github";

const githubRouter = new Hono();

githubRouter.get("/overview/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await githubRepo.getGithubOverview(accountId);
  if (!data.stats && data.repos.length === 0) {
    return c.json({ error: "No data" }, 404);
  }
  return c.json(data);
});

githubRouter.get("/timeline/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await githubRepo.getGithubTimeline(accountId);
  return c.json(data);
});

githubRouter.get("/contributions/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;
  const data = await githubRepo.getGithubContributions(accountId, year);
  return c.json(data);
});

githubRouter.put("/repos/pin", async (c) => {
  const { accountId, repoIds } = await c.req.json() as { accountId: number; repoIds: number[] };
  await githubRepo.setPinnedRepos(accountId, repoIds);
  return c.json({ ok: true });
});

githubRouter.get("/:accountId/repos/:repoId/snapshots", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubRepoSnapshots(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/clones", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubTrafficClones(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/views", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubTrafficViews(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/referrers", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubReferrers(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/referrers/history", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubReferrerHistory(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/paths", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubPaths(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/paths/history", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubPathHistory(accountId, repoId));
});

githubRouter.get("/:accountId/repos/:repoId/releases", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const repoId = Number(c.req.param("repoId"));
  return c.json(await githubRepo.getGithubReleases(accountId, repoId));
});

export default githubRouter;
