import { Hono } from "hono";
import { getGithubOverview, getGithubStatsTimeline, getGithubContributions } from "../db";

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

export default githubRouter;
