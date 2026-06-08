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
import { startScheduler } from "./scheduler";
import { getAccountById } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "./fetchers/reddit";
import { sign, verifySignature } from "./crypto";
import { verifyPassword, setPassword, changePassword } from "./auth";
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

// ── Session helpers ──────────────────────────────────────────────

const SESSION_COOKIE = "dash_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function createSessionToken(username: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}:${expires}`;
  const sig = sign(payload);
  return `${payload}:${sig}`;
}

function validateSession(token: string): string | null {
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [username, expiresStr, sig] = parts;
  const payload = `${username}:${expiresStr}`;
  if (!verifySignature(payload, sig)) return null;
  if (parseInt(expiresStr) < Date.now()) return null;
  return username;
}

// ── App setup ────────────────────────────────────────────────────

const app = new Hono();

// CORS
app.use("/*", cors({
  origin: (origin) => origin, // reflect the origin
  credentials: true,
}));

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
  const username = validateSession(token);
  if (!username) {
    return c.json({ error: "Session expired or invalid" }, 401);
  }

  // Attach user info for potential use
  c.set("sessionUser", username);
  return next();
});

// ── Auth routes ───────────────────────────────────────────────────

app.post(`${BASE}/api/auth/login`, async (c) => {
  try {
    const { password } = await c.req.json();
    const valid = await verifyPassword(password);
    if (!valid) {
      await new Promise(r => setTimeout(r, 800));
      return c.json({ error: "Invalid password" }, 401);
    }
    const session = createSessionToken("admin");
    setCookie(c, SESSION_COOKIE, session, {
      path: `${BASE}/`,
      httpOnly: true,
      secure: protocol === "https",
      sameSite: "Lax",
      maxAge: SESSION_MAX_AGE,
    });
    return c.json({ ok: true, user: "admin" });
  } catch (e) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

app.get(`${BASE}/api/auth/me`, (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ authenticated: false });
  const username = validateSession(token);
  if (!username) return c.json({ authenticated: false });
  return c.json({ authenticated: true, user: username, hasPassword: getUserHasPassword() });
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

// Import here to avoid circular dependency
import { loadConfig } from "./config";
function getUserHasPassword(): boolean {
  try { return !!loadConfig().passwordHash; } catch { return false; }
}

// ── API routes ────────────────────────────────────────────────────

app.route(`${BASE}/api/tweets`, tweetsRouter);
app.route(`${BASE}/api/stats`, statsRouter);
app.route(`${BASE}/api/accounts`, accountsRouter);
app.route(`${BASE}/api/github`, githubRouter);
app.route(`${BASE}/api/gitlab`, gitlabRouter);
app.route(`${BASE}/api/reddit`, redditRouter);

app.get(`${BASE}/api/health`, (c) => c.json({ status: "ok" }));

// Manual trigger for any platform
app.post(`${BASE}/api/fetch/:id`, async (c) => {
  const id = Number(c.req.param("id"));
  const account = getAccountById(id);
  if (!account || !account.is_active) return c.json({ error: "Account not found or inactive" }, 404);

  const fn = account.platform === "github" ? fetchGithubAccount
    : account.platform === "gitlab" ? fetchGitlabAccount
    : account.platform === "reddit"
      ? (account.auth_type === "reddit_public" ? fetchRedditPublicAccount : fetchRedditAccount)
    : fetchAccount;
  fn(account).then((count) => {
    console.log(`[Manual] Fetch complete for @${account.screen_name} (${account.platform})`);
  });

  return c.json({ message: "Fetch started" });
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
