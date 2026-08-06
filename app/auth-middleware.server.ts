import { jwtVerify } from "jose";
import { json } from "@/lib/api-server";
import { isMockMode } from "@/lib/config";
import { bootstrap } from "@/lib/setup";

const SESSION_COOKIE = "dash_session";

// The production node server (server/index.mjs) only wires up the React
// Router request listener; it never ran the DB bootstrap (pool, schema,
// admin seed) that Next.js used to trigger via lib/startup.ts. Bootstrap
// lazily on the first request instead, once per process. Mock mode is a
// no-op inside bootstrap(), so this is safe for `pnpm dev`/`pnpm mock`.
let bootstrapPromise: Promise<void> | null = null;
function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((err) => {
      bootstrapPromise = null; // allow retry on transient DB failures
      throw err;
    });
  }
  return bootstrapPromise;
}

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

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

async function authMiddleware({ request }: { request: Request }): Promise<Response | void> {
  const { pathname } = new URL(request.url);

  // First request initializes PostgreSQL (schema + admin user). Keep this
  // in the server-only middleware so bootstrap never leaks into the client
  // bundle, and so /login works before any DB work is reachable elsewhere.
  await ensureBootstrap();

  // Static assets — pass through
  if (pathname.startsWith("/assets")) {
    return;
  }

  // Public API endpoints — pass through
  if (PUBLIC_API_PATHS.includes(pathname)) {
    return;
  }

  // Public page paths — pass through
  if (PUBLIC_PAGE_PATHS.includes(pathname)) {
    return;
  }

  // Mock/debug mode: accept any session token. Keep /login reachable and
  // require a token for /api + protected pages so the login UX still works.
  if (isMockMode()) {
    const token = getCookie(request, SESSION_COOKIE);
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return new Response(null, { status: 302, headers: { location: loginUrl.toString() } });
    }
    return;
  }

  const token = getCookie(request, SESSION_COOKIE);

  // API routes — return 401 if no token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await jwtVerify(token, JWT_SECRET_KEY, { algorithms: ["HS256"] });
    } catch {
      return json({ error: "Session expired or invalid" }, { status: 401 });
    }
    return;
  }

  // Page routes — redirect to /login if no token
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return new Response(null, { status: 302, headers: { location: loginUrl.toString() } });
  }

  // Validate JWT for page routes
  try {
    await jwtVerify(token, JWT_SECRET_KEY, { algorithms: ["HS256"] });
  } catch {
    const loginUrl = new URL("/login", request.url);
    return new Response(null, { status: 302, headers: { location: loginUrl.toString() } });
  }
}

export const middleware = [authMiddleware];
