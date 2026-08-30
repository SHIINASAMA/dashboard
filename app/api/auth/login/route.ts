import { json, cookieHeader } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { verifyCredentials, verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_MAX_AGE } from "@/lib/auth-helpers";
import { isMockMode } from "@/lib/config";

const SESSION_COOKIE = "dash_session";
// Default to secure=true for production safety. Set HTTPS=false explicitly
// only for local HTTP development.
const IS_SECURE = process.env.HTTPS !== "false";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 10;

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

async function POST(req: Request) {
  // Mock/debug mode: accept any credentials and issue a fake session cookie.
  if (isMockMode()) {
    const setCookie = cookieHeader(SESSION_COOKIE, "mock-session-token", {
      path: "/", httpOnly: true, secure: IS_SECURE, sameSite: "lax", maxAge: SESSION_MAX_AGE,
    });
    return json({ ok: true, user: "admin", role: "admin" }, { headers: { "set-cookie": setCookie } });
  }

  let username: string | undefined;
  let password: string | undefined;
  try {
    ({ username, password } = await req.json());
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // Prefer the proxy-provided X-Real-IP; otherwise take the LAST entry in
    // X-Forwarded-For (the furthest-from-the-client value a trusted proxy adds),
    // rather than the first, which a client could set arbitrarily to bypass the
    // limiter when hitting the server directly.
    const realIp = req.headers.get("x-real-ip")?.trim();
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = realIp
      || (forwarded ? forwarded.split(",").map((s) => s.trim()).filter(Boolean).pop() : undefined)
      || "unknown";
    if (!checkRateLimit(ip)) {
      return json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    if (username && username !== "admin") {
      const result = await verifyCredentials(username, password || "");
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 800));
        return json({ error: "Invalid credentials" }, { status: 401 });
      }
      const token = await createSessionToken(username, result.role || "user");
      const setCookie = cookieHeader(SESSION_COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: IS_SECURE,
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
      });
      return json({ ok: true, user: username, role: result.role }, { headers: { "set-cookie": setCookie } });
    }

    const valid = await verifyPassword(password || "");
    if (!valid) {
      await new Promise((r) => setTimeout(r, 800));
      return json({ error: "Invalid password" }, { status: 401 });
    }
    const token = await createSessionToken("admin", "admin");
    const setCookie = cookieHeader(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      secure: IS_SECURE,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    });
    return json({ ok: true, user: "admin", role: "admin" }, { headers: { "set-cookie": setCookie } });
  } catch (err) {
    // Do not mask real failures (DB down, missing schema, ...) as a client
    // error - log them and return 500 so the operator can see what happened.
    console.error("[login] unexpected error:", err);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
