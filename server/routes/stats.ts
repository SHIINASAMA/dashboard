import { Hono } from "hono";
import {
  getOverviewStats,
  getTimelineStats,
  getTopTweets,
  getCalendarData,
  getDb,
} from "../db";

function parseAccountIds(c: any): number[] | undefined {
  const raw = c.req.query("accountIds");
  if (!raw) return undefined;
  return raw.split(",").map(Number).filter(Boolean);
}

function getTwitterAccountIds(): number[] {
  const rows = getDb().query("SELECT id FROM accounts WHERE platform = 'twitter'").all() as { id: number }[];
  return rows.map(r => r.id);
}

const statsRouter = new Hono();

statsRouter.get("/overview", (c) => {
  const accountIds = parseAccountIds(c);
  const ids = accountIds?.length ? accountIds : getTwitterAccountIds();
  const stats = getOverviewStats(ids);
  return c.json(stats);
});

statsRouter.get("/timeline", (c) => {
  const months = Number(c.req.query("months")) || 6;
  const accountIds = parseAccountIds(c);
  const data = getTimelineStats(months, accountIds);
  return c.json(data);
});

statsRouter.get("/top", (c) => {
  const metric = c.req.query("metric") || "favorite_count";
  const limit = Number(c.req.query("limit")) || 10;
  const accountIds = parseAccountIds(c);
  const data = getTopTweets(metric, limit, accountIds);
  return c.json(data);
});

statsRouter.get("/calendar", (c) => {
  const year = Number(c.req.query("year")) || new Date().getFullYear();
  const accountIds = parseAccountIds(c);
  const data = getCalendarData(year, accountIds);
  return c.json(data);
});

export default statsRouter;
