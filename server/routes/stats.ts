import { Hono } from "hono";
import {
  getOverviewStats,
  getTimelineStats,
  getTopTweets,
  getCalendarData,
} from "../db";

import { getAccounts } from "../db";
import { getUserByUsername } from "../db/queries/users";

function parseAccountIds(c: any): number[] | undefined {
  const raw = c.req.query("accountIds");
  if (!raw) return undefined;
  return raw.split(",").map(Number).filter(Boolean);
}

async function getFilteredTwitterIds(c: any): Promise<number[]> {
  let ownerId: number | undefined;
  if (c.get("sessionRole") !== "admin") {
    const username = c.get("sessionUser") as string;
    const user = await getUserByUsername(username);
    if (!user) return []; // no user, no data
    ownerId = user.id;
  }
  const accounts = await getAccounts(ownerId);
  return accounts.filter((a: any) => a.platform === "twitter").map((r: any) => r.id);
}

const statsRouter = new Hono();

statsRouter.get("/overview", async (c) => {
  const accountIds = parseAccountIds(c);
  const ids = accountIds?.length ? accountIds : await getFilteredTwitterIds(c);
  const stats = await getOverviewStats(ids);
  return c.json(stats);
});

statsRouter.get("/timeline", async (c) => {
  const months = Number(c.req.query("months")) || 6;
  let accountIds = parseAccountIds(c);
  if (!accountIds?.length) accountIds = await getFilteredTwitterIds(c);
  const data = await getTimelineStats(months, accountIds);
  return c.json(data);
});

statsRouter.get("/top", async (c) => {
  const metric = c.req.query("metric") || "favorite_count";
  const limit = Number(c.req.query("limit")) || 10;
  let accountIds = parseAccountIds(c);
  if (!accountIds?.length) accountIds = await getFilteredTwitterIds(c);
  const data = await getTopTweets(metric, limit, accountIds);
  return c.json(data);
});

statsRouter.get("/calendar", async (c) => {
  const year = Number(c.req.query("year")) || new Date().getFullYear();
  let accountIds = parseAccountIds(c);
  if (!accountIds?.length) accountIds = await getFilteredTwitterIds(c);
  const data = await getCalendarData(year, accountIds);
  return c.json(data);
});

export default statsRouter;
