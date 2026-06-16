import { Hono } from "hono";
import type { AppEnv } from "../index";
import * as accountsService from "../services/accounts";
import * as twitterRepo from "../repositories/twitter";
import * as usersRepo from "../repositories/users";
import { validateConfirmToken } from "./confirm";

const accountsRouter = new Hono<AppEnv>();

accountsRouter.get("/", async (c) => {
  let ownerId: number | undefined;
  if (c.get("sessionRole") !== "admin") {
    const username = c.get("sessionUser") as string;
    const user = await usersRepo.getUserByUsername(username);
    ownerId = user?.id;
  }
  const accounts = await accountsService.getAccounts(ownerId);
  const twitterIds = accounts.filter((a) => a.platform === "twitter").map((a) => a.id);
  const overview = await twitterRepo.getOverviewStats(twitterIds.length > 0 ? twitterIds : [-1]);
  const accountsOut = accounts.map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== "auth_token")));
  return c.json({ accounts: accountsOut, overview });
});

accountsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = await accountsService.getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);
  const stats = await twitterRepo.getLatestUserStats(id);
  return c.json({ ...account, stats });
});

accountsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName) return c.json({ error: "screenName is required" }, 400);
  if (!authToken && authType !== "reddit_public") return c.json({ error: "authToken is required" }, 400);
  const token = authToken || "reddit_public";
  try {
    const ownerId = c.get("sessionRole") === "admin"
      ? 1
      : ((await usersRepo.getUserByUsername(c.get("sessionUser") as string))?.id ?? 1);
    const account = await accountsService.createAccount({
      screenName, authToken: token, fetchInterval: fetchInterval || 30,
      platform: platform || "twitter", instanceUrl: instanceUrl || null,
      authType: authType || null, ownerId,
    });
    const pub = Object.fromEntries(Object.entries(account).filter(([k]) => k !== "auth_token"));
    return c.json(pub, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return c.json({ error: "Account with this screen name already exists on this platform" }, 409);
    return c.json({ error: msg }, 500);
  }
});

accountsRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const account = await accountsService.getAccountById(id);
  if (!account) return c.json({ error: "Not found" }, 404);

  const updates: Record<string, string | number | null> = {};
  if (body.screenName !== undefined) updates.screen_name = body.screenName;
  if (body.authToken !== undefined && body.authToken !== "") updates.auth_token = body.authToken;
  if (body.fetchInterval !== undefined) updates.fetch_interval = body.fetchInterval;
  if (body.isActive !== undefined) updates.is_active = body.isActive ? 1 : 0;
  if (body.instanceUrl !== undefined) updates.instance_url = body.instanceUrl;
  if (body.authType !== undefined) updates.auth_type = body.authType;

  await accountsService.updateAccount(id, updates);
  const updated = await accountsService.getAccountById(id);
  if (!updated) return c.json({ error: "Not found" }, 404);
  const pub = Object.fromEntries(Object.entries(updated).filter(([k]) => k !== "auth_token"));
  return c.json(pub);
});

accountsRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return c.json({ error: "Invalid or expired confirmation token" }, 400);
  }
  await accountsService.deleteAccount(id);
  return c.json({ success: true });
});

export default accountsRouter;
