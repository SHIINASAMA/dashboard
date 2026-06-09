import { Hono } from "hono";
import { getRedditOverview, getRedditStatsTimeline, getRedditPosts, getRedditComments, getRedditDailyActivity, getRedditSubredditDistribution, getRedditDailyCommentActivity } from "../db";

const redditRouter = new Hono();

redditRouter.get("/overview/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = await getRedditOverview(accountId);
  return c.json(data);
});

redditRouter.get("/timeline/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  return c.json(await getRedditStatsTimeline(accountId));
});

redditRouter.get("/posts/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  const sort = c.req.query("sort") || "score";
  return c.json(await getRedditPosts(accountId, page, limit, sort));
});

redditRouter.get("/comments/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  return c.json(await getRedditComments(accountId, page, limit));
});

redditRouter.get("/activity/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  const [posts, comments] = await Promise.all([
    getRedditDailyActivity(accountId),
    getRedditDailyCommentActivity(accountId),
  ]);
  return c.json({ posts, comments });
});

redditRouter.get("/subreddits/:accountId", async (c) => {
  const accountId = Number(c.req.param("accountId"));
  return c.json(await getRedditSubredditDistribution(accountId));
});

export default redditRouter;
