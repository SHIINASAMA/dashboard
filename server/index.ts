import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import tweetsRouter from "./routes/tweets";
import statsRouter from "./routes/stats";
import accountsRouter from "./routes/accounts";
import githubRouter from "./routes/github";
import gitlabRouter from "./routes/gitlab";
import redditRouter from "./routes/reddit";
import confirmRouter from "./routes/confirm";
import { validateConfirmToken } from "./routes/confirm";
import { startScheduler } from "./scheduler";
import { getAccountById, updateAccount } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";
import { getJwtSecret } from "./crypto";
import { verifyPassword, verifyCredentials, setNewPassword, changePassword } from "./auth";
import { getUsers, createUser, deleteUser } from "./db/queries/users";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { bootstrap } from "./setup";

import { loadConfig } from "./config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Bootstrap (crypto keys) ──────────────────────────────────────
await bootstrap();

// ── Configuration ────────────────────────────────────────────────

const cfg = loadConfig();
// urlPrefix is always set and does not contain slashes
const PREFIX = cfg.urlPrefix;
const BASE = PREFIX ? `/${PREFIX}` : "";

const port = cfg.port;
const protocol = cfg.https ? "https" : "http";
const host = cfg.host;
const serverUrl = `${protocol}://${host}${port === 443 || port === 80 ? "" : `:${port}`}${BASE}`;

const CLIENT_DIST = join(__dirname, "..", "client", "dist");
const isProd = existsSync(join(CLIENT_DIST, "index.html"));

// ── Rate limiter (in-memory, per IP) ──────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;   // 1 minute
const RATE_MAX_REQUESTS = 10;    // max attempts per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

// Clean expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, 120_000);

// ── Session helpers (JWT) ────────────────────────────────────────

import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "dash_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

async function createSessionToken(username: string, role: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ sub: username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

async function validateSession(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const username = payload.sub;
    const role = payload.role as string | undefined;
    if (!username || !role) return null;
    return { username, role };
  } catch {
    return null;
  }
}

// ── App setup ────────────────────────────────────────────────────

const app = new Hono();

// CORS — controlled by config.allowedOrigins.
// Default empty = no cross-origin access. Set to ["*"] to allow all,
// or specific origins like ["https://my-dashboard.example.com"].
const allowed = cfg.allowedOrigins || [];
if (allowed.length > 0) {
  const allowAll = allowed.includes("*");
  app.use("/*", cors({
    origin: allowAll ? "*" : (origin) => {
      if (!origin) return "*";
      if (allowed.includes(origin)) return origin;
      return allowed[0]; // return first allowed origin for non-matching origins (browser will reject)
    },
    credentials: true,
  }));
}

// ── Auth middleware ───────────────────────────────────────────────

// Require auth for all API routes except auth endpoints and health
app.use(`${BASE}/api/*`, async (c, next) => {
  const path = c.req.path;

  // Public endpoints (no session required)
  if (path === `${BASE}/api/health`) return next();
  if (path === `${BASE}/api/auth/login`) return next();
  if (path === `${BASE}/api/auth/me`) return next();
  if (path === `${BASE}/api/reddit/callback`) return next();

  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await validateSession(token);
  if (!session) {
    return c.json({ error: "Session expired or invalid" }, 401);
  }

  // Attach user info for potential use
  c.set("sessionUser", session.username);
  c.set("sessionRole", session.role);
  return next();
});

// ── Auth routes ───────────────────────────────────────────────────

app.post(`${BASE}/api/auth/login`, async (c) => {
  try {
    // Rate limit by IP
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Too many login attempts. Please try again later." }, 429);
    }

    const { username, password } = await c.req.json();
    // Multi-user login
    if (username && username !== "admin") {
      const result = await verifyCredentials(username, password || "");
      if (!result.ok) {
        await new Promise(r => setTimeout(r, 800));
        return c.json({ error: "Invalid credentials" }, 401);
      }
      const session = await createSessionToken(username, result.role || "user");
      setCookie(c, SESSION_COOKIE, session, {
        path: `${BASE}/`,
        httpOnly: true,
        secure: protocol === "https",
        sameSite: "Lax",
        maxAge: SESSION_MAX_AGE,
      });
      return c.json({ ok: true, user: username, role: result.role });
    }
    // Legacy admin login
    const valid = await verifyPassword(password);
    if (!valid) {
      await new Promise(r => setTimeout(r, 800));
      return c.json({ error: "Invalid password" }, 401);
    }
    const session = await createSessionToken("admin", "admin");
    setCookie(c, SESSION_COOKIE, session, {
      path: `${BASE}/`,
      httpOnly: true,
      secure: protocol === "https",
      sameSite: "Lax",
      maxAge: SESSION_MAX_AGE,
    });
    return c.json({ ok: true, user: "admin", role: "admin" });
  } catch (e) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

app.get(`${BASE}/api/auth/me`, async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ authenticated: false });
  const session = await validateSession(token);
  if (!session) return c.json({ authenticated: false });
  return c.json({ authenticated: true, username: session.username, role: session.role });
});

app.post(`${BASE}/api/auth/logout`, (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: `${BASE}/`, maxAge: 0 });
  return c.json({ ok: true });
});

// Change password (requires current session)
app.post(`${BASE}/api/auth/change-password`, async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();
    if (!newPassword || newPassword.length < 4) {
      return c.json({ error: "Password must be at least 4 characters" }, 400);
    }
    const ok = await changePassword(currentPassword, newPassword);
    if (!ok) {
      await new Promise(r => setTimeout(r, 800));
      return c.json({ error: "Current password is incorrect" }, 401);
    }
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

// ── User management (admin only) ──────────────────────────────────

app.get(`${BASE}/api/users`, async (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  return c.json({ users: await getUsers() });
});

app.post(`${BASE}/api/users`, async (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  const { username, password, role } = await c.req.json();
  if (!username || !password) return c.json({ error: "username and password required" }, 400);
  if (password.length < 4) return c.json({ error: "Password must be at least 4 characters" }, 400);
  try {
    const user = await createUser(username, password, role || "user");
    const { password_hash, ...pub } = user;
    return c.json(pub, 201);
  } catch (e: any) {
    if (e.message?.includes?.("UNIQUE")) return c.json({ error: "Username already exists" }, 409);
    return c.json({ error: e.message }, 500);
  }
});

app.delete(`${BASE}/api/users/:id`, async (c) => {
  if (c.get("sessionRole") !== "admin") return c.json({ error: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  if (id === 1) return c.json({ error: "Cannot delete the bootstrap admin" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const { confirmToken } = body as any;
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return c.json({ error: "Invalid or expired confirmation token" }, 400);
  }
  await deleteUser(id);
  return c.json({ ok: true });
});

// ── API routes ────────────────────────────────────────────────────

app.route(`${BASE}/api/tweets`, tweetsRouter);
app.route(`${BASE}/api/stats`, statsRouter);
app.route(`${BASE}/api/accounts`, accountsRouter);
app.route(`${BASE}/api/github`, githubRouter);
app.route(`${BASE}/api/gitlab`, gitlabRouter);
app.route(`${BASE}/api/reddit`, redditRouter);
app.route(`${BASE}/api/confirm`, confirmRouter);

app.get(`${BASE}/api/health`, (c) => c.json({ status: "ok" }));

// Manual trigger for any platform
app.post(`${BASE}/api/fetch/:id`, async (c) => {
  const id = Number(c.req.param("id"));
  const account = await getAccountById(id);
  if (!account) return c.json({ error: "Account not found" }, 404);
  if (!account.is_active) {
    await updateAccount(id, { is_active: 1 } as any);
    account.is_active = 1;
  }

  const fn = account.platform === "github" ? fetchGithubAccount
    : account.platform === "gitlab" ? fetchGitlabAccount
    : account.platform === "reddit"
    ? (account.auth_type === "reddit_public" ? fetchRedditPublicAccount : fetchRedditAccount)
    : fetchAccount;

  // Run in background to avoid proxy timeout on long fetches
  fn(account).catch((e: any) =>
    console.error(`[Fetch ${id}] Background error:`, e.message)
  );
  return c.json({ ok: true, message: `Fetch started for @${account.screen_name}` });
});

// ── Serve client SPA (production) ─────────────────────────────────

if (isProd) {
  const rewrite = (path: string) => path.replace(BASE, "") || "/";

  app.use(`${BASE}/assets/*`, serveStatic({
    root: join(CLIENT_DIST, "assets"),
    rewriteRequestPath: rewrite,
  }));
  app.use(`${BASE}/*`, serveStatic({
    root: CLIENT_DIST,
    rewriteRequestPath: rewrite,
  }));

  // SPA fallback: serve index.html for all non-API GET routes
  app.get(`${BASE}/*`, async (c) => {
    const indexPath = join(CLIENT_DIST, "index.html");
    if (existsSync(indexPath)) {
      c.header("Content-Type", "text/html");
      return c.body(readFileSync(indexPath, "utf-8"));
    }
    return c.notFound();
  });
}

startScheduler();

console.log(`Server running on ${serverUrl}`);
console.log(`URL prefix: ${BASE || "(none)"}`);
if (isProd) console.log("Serving production client build");

// Export the redirect URI so the fetcher can use it for OAuth callbacks
export function getServerBaseUrl(): string {
  return serverUrl;
}

export default { port, fetch: app.fetch };
