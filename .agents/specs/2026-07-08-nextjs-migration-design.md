# Next.js Full-Stack Migration Design

**Date**: 2026-07-08
**Status**: Approved

## Goal

Migrate the dashboard project from its current Hono + Vite SPA architecture to a full-stack Next.js application using App Router. The frontend UI and backend API must remain identical — same endpoints, same JSON responses, same page behavior.

## Constraints

- **Self-hosted Node.js runtime** (Docker) — not serverless
- **PostgreSQL** via `pg` + `drizzle-orm/node-postgres` — connection pool is external, framework-agnostic
- API endpoints, URL paths, and JSON response formats must not change
- Frontend pages must look and behave identically
- Scheduler (background fetch every 60s) must continue running

## Architecture Overview

```
Next.js (port 3000, single process)
├── app/
│   ├── api/          ← Route Handlers (replace Hono handlers)
│   ├── (dashboard)/  ← Auth-guarded pages
│   └── login/        ← Public page
├── lib/              ← Business logic (migrated from server/)
│   ├── db/           ← PostgreSQL connection + Drizzle schemas
│   ├── services/     ← Business logic (unchanged)
│   ├── repositories/ ← Data access layer (unchanged)
│   ├── fetchers/     ← Platform fetchers (unchanged)
│   └── scheduler.ts  ← Background task (unchanged)
├── middleware.ts      ← Auth guard (replaces Hono middleware)
└── shared/           ← Shared types (unchanged)
```

## Design Sections

### 1. Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx                    # Root layout (html/body/providers)
│   ├── page.tsx                      # Redirect to /overview or /login
│   ├── providers.tsx                 # Client providers (QueryClientProvider)
│   ├── login/page.tsx                # Login page
│   ├── (dashboard)/                  # Route group (no URL prefix)
│   │   ├── layout.tsx                # Sidebar + auth guard layout
│   │   ├── page.tsx                  # Overview
│   │   ├── accounts/page.tsx
│   │   ├── x/page.tsx
│   │   ├── x/[id]/page.tsx
│   │   ├── github/page.tsx
│   │   ├── github/[id]/page.tsx
│   │   ├── github/[accountId]/repos/[repoId]/page.tsx
│   │   ├── gitlab/page.tsx
│   │   ├── gitlab/[id]/page.tsx
│   │   ├── gitlab/[accountId]/projects/[projectId]/page.tsx
│   │   ├── reddit/page.tsx
│   │   ├── reddit/[id]/page.tsx
│   │   ├── admin/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/me/route.ts
│       ├── auth/logout/route.ts
│       ├── auth/change-password/route.ts
│       ├── accounts/route.ts
│       ├── accounts/[id]/route.ts
│       ├── users/route.ts
│       ├── users/[id]/route.ts
│       ├── tweets/route.ts
│       ├── tweets/[id]/route.ts
│       ├── stats/overview/route.ts
│       ├── stats/timeline/route.ts
│       ├── stats/top/route.ts
│       ├── stats/calendar/route.ts
│       ├── github/overview/[accountId]/route.ts
│       ├── github/timeline/[accountId]/route.ts
│       ├── github/contributions/[accountId]/route.ts
│       ├── github/[accountId]/repos/[repoId]/route.ts
│       ├── github/[accountId]/repos/[repoId]/snapshots/route.ts
│       ├── github/[accountId]/repos/[repoId]/clones/route.ts
│       ├── github/[accountId]/repos/[repoId]/views/route.ts
│       ├── github/[accountId]/repos/[repoId]/referrers/route.ts
│       ├── github/[accountId]/repos/[repoId]/referrers/history/route.ts
│       ├── github/[accountId]/repos/[repoId]/paths/route.ts
│       ├── github/[accountId]/repos/[repoId]/paths/history/route.ts
│       ├── github/[accountId]/repos/[repoId]/releases/route.ts
│       ├── github/[accountId]/repos/[repoId]/releases/[releaseId]/assets/route.ts
│       ├── github/repos/pin/route.ts
│       ├── gitlab/overview/[accountId]/route.ts
│       ├── gitlab/timeline/[accountId]/route.ts
│       ├── gitlab/contributions/[accountId]/route.ts
│       ├── gitlab/[accountId]/projects/[projectId]/route.ts
│       ├── gitlab/[accountId]/projects/[projectId]/snapshots/route.ts
│       ├── gitlab/[accountId]/projects/[projectId]/releases/route.ts
│       ├── gitlab/projects/pin/route.ts
│       ├── reddit/overview/[accountId]/route.ts
│       ├── reddit/timeline/[accountId]/route.ts
│       ├── reddit/posts/[accountId]/route.ts
│       ├── reddit/comments/[accountId]/route.ts
│       ├── reddit/activity/[accountId]/route.ts
│       ├── reddit/subreddits/[accountId]/route.ts
│       ├── reddit/callback/route.ts
│       ├── fetch/[id]/route.ts
│       ├── confirm/token/route.ts
│       ├── health/route.ts
│       └── bing-wallpaper/route.ts
├── lib/
│   ├── db/
│   │   ├── connection.ts         # PostgreSQL pool (unchanged logic)
│   │   └── schema/               # Drizzle ORM schemas (unchanged)
│   ├── services/                 # Business logic (unchanged)
│   ├── repositories/             # Data access layer (unchanged)
│   ├── fetchers/                 # Platform fetchers (unchanged)
│   ├── auth.ts                   # Password hashing, credential verification
│   ├── crypto.ts                 # JWT signing, AES-256-GCM encryption
│   ├── config.ts                 # Config load/save
│   ├── http.ts                   # fetchWithConfig (TLS-configurable)
│   ├── logger.ts                 # Structured file logger
│   ├── scheduler.ts              # Per-platform dispatch every 60s
│   ├── scheduler-singleton.ts    # Singleton wrapper for scheduler
│   ├── startup.ts                # Side-effect import to init scheduler
│   ├── fetcher.ts                # X (Twitter) fetcher
│   ├── api.ts                    # Client API wrapper (from client/src/api.ts)
│   ├── utils.ts                  # cn(), theme utils
│   └── hooks/                    # Custom hooks
├── components/                   # Shared UI components
│   ├── Layout.tsx                # Sidebar + title bar (client component)
│   ├── Skeleton.tsx
│   ├── NavigationProgress.tsx
│   └── NavigatingOverlay.tsx
├── locales/                      # i18n files (unchanged)
├── shared/
│   └── types.ts                  # Shared TypeScript types (unchanged)
├── middleware.ts                  # Next.js Middleware (auth guard)
├── drizzle.config.ts             # Unchanged
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

**Key decisions:**
- `(dashboard)` is a route group — no URL prefix, just organizational grouping for auth-guarded pages
- `lib/` holds all backend business logic, decoupled from `app/api/` HTTP layer
- `client/` directory is deleted; components move to `components/` or `app/`
- `server/` directory is deleted; logic moves to `lib/`

### 2. API Route Migration

**Principle:** Same HTTP interface, different framework layer.

**Route Handler pattern:**

`getSession(req)` is a helper that extracts the `dash_session` cookie and validates the JWT using `jose` (Edge-compatible). Returns `{ username, role }` or `null`.

```ts
// Hono (current)
router.get("/", async (c) => {
  const accounts = await getAccounts(userId);
  return c.json({ accounts });
});

// Next.js Route Handler (target)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await getAccounts(session.userId);
  return NextResponse.json({ accounts });
}
```

**Dynamic routes:**

```
Hono:     router.get("/:id", ...)       →  app/api/accounts/[id]/route.ts
Hono:     router.get("/:accountId/repos/:repoId", ...)  →  app/api/github/[accountId]/repos/[repoId]/route.ts
```

Params accessed via: `const { id } = await params;`

**Background fetch pattern (unchanged):**

```ts
// POST /api/fetch/[id] — returns immediately, runs in background
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountById(Number(id));
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const fn = /* select fetcher by platform */;
  fn(account).catch(console.error);  // Background execution

  return NextResponse.json({ ok: true, message: `Fetch started for @${account.screen_name}` });
}
```

**Files to rewrite (approx 15-20):**
- 15 API route files (Hono handler → Route Handler signature conversion)
- 1 Middleware file (auth guard)

**Files unchanged (approx 30+):**
- `lib/db/` (all schemas + connection)
- `lib/services/` (all)
- `lib/repositories/` (all)
- `lib/fetchers/` (all)
- `shared/types.ts`
- Page component JSX/rendering logic

### 3. Authentication Middleware

Replaces Hono's `/api/*` auth middleware with Next.js Middleware.

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/reddit/callback",
  "/api/bing-wallpaper",
  "/api/health",
  "/login",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and public paths — pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets") || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // API routes — check session cookie
  if (pathname.startsWith("/api/")) {
    const token = req.cookies.get("dash_session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Page routes — redirect to /login if no session
  const token = req.cookies.get("dash_session")?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Constraints:**
- Middleware runs in Edge Runtime — `jose` (JWT) works, but `pg`/`libsql` do not
- JWT verification uses `jose` (Edge-compatible)
- Role-based checks (admin) remain in individual Route Handlers

### 4. Scheduler and Background Tasks

Next.js runs as a long-lived Node.js process in self-hosted mode, so the scheduler can initialize as a module-level singleton.

**Singleton pattern:**

```ts
// lib/scheduler-singleton.ts
import { startScheduler } from "./scheduler";

let started = false;

export function ensureScheduler() {
  if (!started) {
    started = true;
    startScheduler();
  }
}
```

**Startup via side-effect import:**

```ts
// lib/startup.ts
import { ensureScheduler } from "./scheduler-singleton";
ensureScheduler();
```

```tsx
// app/layout.tsx (Server Component)
import "@/lib/startup"; // Side-effect: starts scheduler

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Risks and mitigations:**
1. **HMR duplicate starts** — singleton `started` flag prevents re-initialization during dev
2. **Multiple workers** — keep single worker (Next.js default); add PostgreSQL-based lock later if needed
3. **setInterval cleanup** — optional: store interval ID, clear on module unload for cleaner HMR

### 5. Frontend Migration

**Page components → Client Components:**

All page components become `"use client"` because they use React Query hooks, `useState`/`useEffect`, and navigation hooks.

```tsx
// app/(dashboard)/x/[id]/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function XDetail() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["tweet", params.id],
    queryFn: () => api.getTweet(params.id),
  });
  // ... rendering logic unchanged
}
```

**Providers:**

```tsx
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 3 * 60_000 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

```tsx
// app/layout.tsx (Server Component)
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Navigation hooks migration:**

| react-router-dom | next/navigation |
|-----------------|-----------------|
| `useNavigate()` | `useRouter()` |
| `useParams()` | `useParams()` |
| `useLocation()` | `usePathname()` |
| `<Link to="/x">` | `<Link href="/x">` |
| `<Navigate to="/">` | `redirect("/")` or `router.push("/")` |
| lazy loading (`React.lazy`) | Not needed (App Router auto code-splitting) |

**API client** (`lib/api.ts`): Moved from `client/src/api.ts`, content unchanged — pure fetch wrapper.

**i18n** (`react-i18next`): Pure client library, directly reusable. No initial changes needed.

**Styling** (Tailwind CSS v4 + shadcn/ui): Directly reusable. Vite `@tailwindcss/vite` plugin replaced with Next.js config, but CSS itself unchanged.

### 6. Database

PostgreSQL connection pool (`pg` + `drizzle-orm/node-postgres`) is external and framework-agnostic.

- `lib/db/connection.ts`: Import path change only (`server/db/connection` → `@/lib/db/connection`), code unchanged
- `db/schema/`: Unchanged
- `db/migrations/`: Unchanged
- `drizzle.config.ts`: Unchanged

No SQLite concerns — PostgreSQL runs as a separate service (Docker Compose or external).

### 7. Deployment

**next.config.ts:**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["argon2"],
};

export default nextConfig;
```

**Dockerfile (Next.js standalone):**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

**Port unification:**

| | Current | After migration |
|--|---------|-----------------|
| Dev | Server: 3001, Client: 5173 | Next.js: 3000 |
| Prod | Server: 3001 (serves SPA) | Next.js: 3000 |

**Dev commands:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

**pnpm workspace:** Simplified from monorepo to single project; `client/` sub-package deleted.

### 8. Unchanged Components

The following move directories but have zero code changes:

- `db/schema/*` — Drizzle ORM schemas
- `server/services/*` → `lib/services/*`
- `server/repositories/*` → `lib/repositories/*`
- `server/fetchers/*` → `lib/fetchers/*`
- `server/crypto.ts` → `lib/crypto.ts`
- `server/config.ts` → `lib/config.ts`
- `server/http.ts` → `lib/http.ts`
- `server/logger.ts` → `lib/logger.ts`
- `server/scheduler.ts` → `lib/scheduler.ts`
- `server/fetcher.ts` → `lib/fetcher.ts`
- `shared/types.ts`
- All page component JSX (rendering logic unchanged)

### 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scheduler HMR re-initialization | Low | Singleton flag prevents duplicate starts |
| Multiple Next.js workers | Medium | Keep single worker; add PG-based lock if scaling needed |
| Middleware Edge Runtime limitations | Low | JWT via `jose` (Edge-compatible); role checks in Route Handlers |
| `argon2` native module in standalone | Medium | Listed in `serverExternalPackages`; test Docker build |
| i18n routing not using Next.js i18n | Low | Acceptable for initial migration; upgrade later if needed |
