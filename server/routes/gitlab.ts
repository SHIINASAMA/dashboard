import { Hono } from "hono";
import * as gitlabRepo from "../repositories/gitlab";

const gitlabRouter = new Hono();

gitlabRouter.get("/overview/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await gitlabRepo.getGitlabOverview(accountId);
  if (!data.stats && data.projects.length === 0) {
    return c.json({ error: "No data" }, 404);
  }
  return c.json(data);
});

gitlabRouter.get("/timeline/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await gitlabRepo.getGitlabTimeline(accountId);
  return c.json(data);
});

gitlabRouter.get("/contributions/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;
  const data = await gitlabRepo.getGitlabContributions(accountId, year);
  return c.json(data);
});

gitlabRouter.put("/projects/pin", async (c) => {
  const { accountId, projectIds } = await c.req.json() as { accountId: number; projectIds: number[] };
  await gitlabRepo.setPinnedGitlabProjects(accountId, projectIds);
  return c.json({ ok: true });
});

gitlabRouter.get("/:accountId/projects/:projectId/snapshots", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const projectId = Number(c.req.param("projectId"));
  return c.json(await gitlabRepo.getGitlabProjectSnapshots(accountId, projectId));
});

gitlabRouter.get("/:accountId/projects/:projectId/releases", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const projectId = Number(c.req.param("projectId"));
  return c.json(await gitlabRepo.getGitlabReleases(accountId, projectId));
});

export default gitlabRouter;
