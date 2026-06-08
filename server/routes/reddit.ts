import { Hono } from "hono";
import { getRedditOverview, getRedditStatsTimeline, getRedditPosts, getRedditComments, getRedditDailyActivity, getRedditSubredditDistribution, getRedditDailyCommentActivity } from "../db";

const redditRouter = new Hono();

redditRouter.get("/overview/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const data = getRedditOverview(accountId);
  return c.json(data);
});

redditRouter.get("/timeline/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  return c.json(getRedditStatsTimeline(accountId));
});

redditRouter.get("/posts/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  const sort = c.req.query("sort") || "score";
  return c.json(getRedditPosts(accountId, page, limit, sort));
});

redditRouter.get("/comments/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;
  return c.json(getRedditComments(accountId, page, limit));
});

redditRouter.get("/activity/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  const posts = getRedditDailyActivity(accountId);
  const comments = getRedditDailyCommentActivity(accountId);
  return c.json({ posts, comments });
});

redditRouter.get("/subreddits/:accountId", (c) => {
  const accountId = Number(c.req.param("accountId"));
  return c.json(getRedditSubredditDistribution(accountId));
});

export default redditRouter;
