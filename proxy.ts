import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isMockMode } from "./lib/config";

const SESSION_COOKIE = "dash_session";

/** Decode a 64-char hex string to a 32-byte Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Fallback key so importing this module without DASHBOARD_SECRET (e.g. mock
// mode) doesn't crash. Only used when not in mock mode and the secret is set.
const JWT_SECRET_KEY = hexToBytes(process.env.DASHBOARD_SECRET || "0".repeat(64));

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/reddit/callback",
  "/api/bing-wallpaper",
  "/api/health",
];

const PUBLIC_PAGE_PATHS = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets — pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  // Public API endpoints — pass through
  if (PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Public page paths — pass through
  if (PUBLIC_PAGE_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Mock/debug mode: accept any session token. Keep /login reachable and
  // require a token for /api + protected pages so the login UX still works.
  if (isMockMode()) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  // API routes — return 401 if no token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await jwtVerify(token, JWT_SECRET_KEY, { algorithms: ["HS256"] });
    } catch {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Page routes — redirect to /login if no token
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate JWT for page routes
  try {
    await jwtVerify(token, JWT_SECRET_KEY, { algorithms: ["HS256"] });
  } catch {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
