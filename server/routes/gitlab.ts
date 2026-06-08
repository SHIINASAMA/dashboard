import { Hono } from "hono";
import {
  getGitlabOverview, getGitlabStatsTimeline, getGitlabContributions,
  getGitlabProjectSnapshots, getGitlabReleases,
  setPinnedGitlabProjects,
} from "../db";

const gitlabRouter = new Hono();

gitlabRouter.get("/overview/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = getGitlabOverview(accountId);
  if (!data.stats && data.projects.length === 0) {
    return c.json({ error: "No data" }, 404);
  }
  return c.json(data);
});

gitlabRouter.get("/timeline/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = getGitlabStatsTimeline(accountId);
  return c.json(data);
});

gitlabRouter.get("/contributions/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const year = c.req.query("year") ? Number(c.req.query("year")) : undefined;
  const data = getGitlabContributions(accountId, year);
  return c.json(data);
});

// ─── Project pinning ─────────────────────────────────────────────

gitlabRouter.put("/projects/pin", async (c) => {
  const { accountId, projectIds } = await c.req.json() as { accountId: number; projectIds: number[] };
  setPinnedGitlabProjects(accountId, projectIds);
  return c.json({ ok: true });
});

// ─── Project Insights ────────────────────────────────────────────

gitlabRouter.get("/:accountId/projects/:projectId/snapshots", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const projectId = Number(c.req.param("projectId"));
  return c.json(getGitlabProjectSnapshots(accountId, projectId));
});

gitlabRouter.get("/:accountId/projects/:projectId/releases", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const projectId = Number(c.req.param("projectId"));
  return c.json(getGitlabReleases(accountId, projectId));
});

export default gitlabRouter;
