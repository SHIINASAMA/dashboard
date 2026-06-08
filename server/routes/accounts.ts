import { Hono } from "hono";
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getOverviewStats,
  getLatestUserStats,
} from "../db";

const accountsRouter = new Hono();

accountsRouter.get("/", (c) => {
  const accounts = getAccounts();
  const twitterIds = accounts.filter((a) => a.platform === "twitter").map((a) => a.id);
  const overview = getOverviewStats(twitterIds.length > 0 ? twitterIds : []);
  return c.json({ accounts, overview });
});

accountsRouter.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const account = getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);
  const { auth_token, ...pub } = account;
  const stats = getLatestUserStats(id);
  return c.json({ ...pub, stats });
});

accountsRouter.post("/", (c) => c.req.json().then((body) => {
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName) {
    return c.json({ error: "screenName is required" }, 400);
  }
  if (!authToken && authType !== "reddit_public") {
    return c.json({ error: "authToken is required" }, 400);
  }
  const token = authToken || "reddit_public";
  try {
    const account = createAccount(screenName, token, fetchInterval || 30, platform || "twitter", instanceUrl || null, authType || null);
    const { auth_token, ...pub } = account;
    return c.json(pub, 201);
  } catch (e: any) {
    if (e.message?.includes?.("UNIQUE")) {
      return c.json({ error: "Account with this screen name already exists on this platform" }, 409);
    }
    return c.json({ error: e.message }, 500);
  }
}));

accountsRouter.put("/:id", (c) => c.req.json().then((body) => {
  const id = Number(c.req.param("id"));
  const account = getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);

  const updates: Record<string, any> = {};
  if (body.screenName) updates.screen_name = body.screenName;
  if (body.authToken) updates.auth_token = body.authToken;
  if (body.fetchInterval !== undefined) updates.fetch_interval = body.fetchInterval;
  if (body.isActive !== undefined) updates.is_active = body.isActive ? 1 : 0;
  if (body.instanceUrl !== undefined) updates.instance_url = body.instanceUrl;
  if (body.authType !== undefined) updates.auth_type = body.authType;

  updateAccount(id, updates);
  const updated = getAccountById(id)!;
  const { auth_token, ...pub } = updated;
  return c.json(pub);
}));

accountsRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  deleteAccount(id);
  return c.json({ success: true });
});

export default accountsRouter;
