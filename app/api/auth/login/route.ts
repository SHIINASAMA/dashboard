import { json, cookieHeader } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { verifyCredentials, verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_MAX_AGE } from "@/lib/auth-helpers";
import { isMockMode } from "@/lib/config";

const SESSION_COOKIE = "dash_session";
const IS_SECURE = process.env.HTTPS === "true";

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

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const { username, password } = await req.json();

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

    const valid = await verifyPassword(password);
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
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
