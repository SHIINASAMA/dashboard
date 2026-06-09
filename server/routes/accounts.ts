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
import { getUserByUsername } from "../db/queries/users";
import { validateConfirmToken } from "./confirm";

const accountsRouter = new Hono();

accountsRouter.get("/", async (c) => {
  let ownerId: number | undefined;
  if (c.get("sessionRole") !== "admin") {
    const username = c.get("sessionUser") as string;
    const user = await getUserByUsername(username);
    ownerId = user?.id;
  }
  const accounts = await getAccounts(ownerId);
  const twitterIds = accounts.filter((a: any) => a.platform === "twitter").map((a: any) => a.id);
  const overview = getOverviewStats(twitterIds.length > 0 ? twitterIds : []);
  return c.json({ accounts, overview });
});

accountsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = await getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);
  const { auth_token, ...pub } = account;
  const stats = getLatestUserStats(id);
  return c.json({ ...pub, stats });
});

accountsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName) return c.json({ error: "screenName is required" }, 400);
  if (!authToken && authType !== "reddit_public") return c.json({ error: "authToken is required" }, 400);
  const token = authToken || "reddit_public";
  try {
    const ownerId = c.get("sessionRole") === "admin" ? 1 : ((await getUserByUsername(c.get("sessionUser") as string))?.id ?? 1);
    const account = await createAccount(screenName, token, fetchInterval || 30, platform || "twitter", instanceUrl || null, authType || null, ownerId);
    const { auth_token, ...pub } = account;
    return c.json(pub, 201);
  } catch (e: any) {
    if (e.message?.includes?.("UNIQUE")) return c.json({ error: "Account with this screen name already exists on this platform" }, 409);
    return c.json({ error: e.message }, 500);
  }
});

accountsRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const account = await getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);

  const updates: Record<string, any> = {};
  if (body.screenName) updates.screen_name = body.screenName;
  if (body.authToken) updates.auth_token = body.authToken;
  if (body.fetchInterval !== undefined) updates.fetch_interval = body.fetchInterval;
  if (body.isActive !== undefined) updates.is_active = body.isActive ? 1 : 0;
  if (body.instanceUrl !== undefined) updates.instance_url = body.instanceUrl;
  if (body.authType !== undefined) updates.auth_type = body.authType;

  await updateAccount(id, updates);
  const updated = await getAccountById(id);
  if (!updated) return c.json({ error: "Not found" }, 404);
  const { auth_token, ...pub } = updated;
  return c.json(pub);
});

accountsRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const { confirmToken } = body as any;
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return c.json({ error: "Invalid or expired confirmation token" }, 400);
  }
  deleteAccount(id);
  return c.json({ success: true });
});

export default accountsRouter;
