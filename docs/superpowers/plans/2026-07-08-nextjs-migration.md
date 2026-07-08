# Next.js Full-Stack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the dashboard from Hono + Vite SPA to full-stack Next.js App Router with identical API and UI.

**Architecture:** Next.js App Router handles both frontend (file-based routing, React Server Components) and backend (Route Handlers). Business logic (services, repositories, fetchers) moves from `server/` to `lib/` with zero code changes. PostgreSQL connection via `pg` + Drizzle ORM is framework-agnostic.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, @tanstack/react-query 5, Drizzle ORM, PostgreSQL (`pg`), jose (JWT), argon2

## Global Constraints

- Self-hosted Node.js runtime (Docker) — not serverless
- PostgreSQL via `pg` + `drizzle-orm/node-postgres` — external service
- All API endpoints, URL paths, and JSON response formats must remain identical
- Frontend pages must look and behave identically
- Scheduler (background fetch every 60s) must continue running
- Port: 3000 (unified for dev and prod)

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Next.js project structure

**Files:**
- Create: `next.config.ts`
- Create: `tsconfig.json` (root level, replaces both client/tsconfig.app.json and server needs)
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `middleware.ts`
- Modify: `package.json` (update scripts, add next.js dependencies)
- Delete: `client/` directory (after all files are migrated)
- Delete: `pnpm-workspace.yaml` (no longer a monorepo)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: Next.js project boots with `pnpm dev`

**Step 1: Install Next.js dependencies**

Run from project root:
```bash
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react @types/react-dom eslint-config-next
```

**Step 2: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["argon2"],
};

export default nextConfig;
```

**Step 3: Create root `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create `app/layout.tsx` (minimal)**

```tsx
export const metadata = {
  title: "Dashboard",
  description: "Multi-platform social & code dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 5: Create `app/page.tsx` (minimal)**

```tsx
export default function Home() {
  return <div>Dashboard</div>;
}
```

**Step 6: Create minimal `middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 7: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run server/__tests__/"
  }
}
```

**Step 8: Verify project boots**

```bash
pnpm dev
# Open http://localhost:3000 — should see "Dashboard" text
```

**Step 9: Commit**

```bash
git add next.config.ts tsconfig.json app/ middleware.ts package.json pnpm-lock.yaml
git commit -m "chore: scaffold Next.js project alongside existing code"
```

---

### Task 2: Move business logic from `server/` to `lib/`

**Files:**
- Move: `server/services/*` → `lib/services/*`
- Move: `server/repositories/*` → `lib/repositories/*`
- Move: `server/fetchers/*` → `lib/fetchers/*`
- Move: `server/fetcher.ts` → `lib/fetcher.ts`
- Move: `server/auth.ts` → `lib/auth.ts`
- Move: `server/crypto.ts` → `lib/crypto.ts`
- Move: `server/config.ts` → `lib/config.ts`
- Move: `server/http.ts` → `lib/http.ts`
- Move: `server/logger.ts` → `lib/logger.ts`
- Move: `server/scheduler.ts` → `lib/scheduler.ts`
- Move: `server/setup.ts` → `lib/setup.ts`
- Move: `server/db/` → `lib/db/`
- Move: `db/` → `db/` (stays, but update drizzle.config.ts paths if needed)

**Interfaces:**
- Consumes: nothing
- Produces: all business logic accessible from `@/lib/*`

**Step 1: Create `lib/` directory and move files**

```bash
mkdir -p lib
cp -r server/services lib/services
cp -r server/repositories lib/repositories
cp -r server/fetchers lib/fetchers
cp server/fetcher.ts lib/fetcher.ts
cp server/auth.ts lib/auth.ts
cp server/crypto.ts lib/crypto.ts
cp server/config.ts lib/config.ts
cp server/http.ts lib/http.ts
cp server/logger.ts lib/logger.ts
cp server/scheduler.ts lib/scheduler.ts
cp server/setup.ts lib/setup.ts
cp -r server/db lib/db
```

**Step 2: Update internal imports in `lib/` files**

Every file in `lib/` that imports from `../server/` or `./` (relative to server/) needs path updates. The main patterns:

In `lib/services/accounts.ts`, `lib/services/users.ts`:
```ts
// Change: import from "../repositories/..." 
// To:     import from "../repositories/..."  (no change — relative paths stay the same within lib/)
```

In `lib/fetchers/github.ts`, `lib/fetchers/gitlab.ts`, `lib/fetchers/reddit.ts`:
```ts
// Change: import from "../../server/repositories/..."
// To:     import from "../repositories/..."  (one level up from fetchers/)
```

In `lib/scheduler.ts`:
```ts
// Change: import from "./services/accounts"
// To:     import from "./services/accounts"  (no change)
// Change: import from "./fetcher"
// To:     import from "./fetcher"  (no change)
// Change: import from "./fetchers/github"
// To:     import from "./fetchers/github"  (no change)
// Change: import from "./logger"
// To:     import from "./logger"  (no change)
```

In `lib/setup.ts`:
```ts
// Change: import from "./config"
// To:     import from "./config"  (no change)
// Change: import from "./crypto"
// To:     import from "./crypto"  (no change)
// Change: import from "./db/connection"
// To:     import from "./db/connection"  (no change)
// Change: import from "./services/users"
// To:     import from "./services/users"  (no change)
// Change: import from "./repositories/users"
// To:     import from "./repositories/users"  (no change)
```

In `lib/db/connection.ts`:
```ts
// Change: import from "../../db/schema/index.js"
// To:     import from "../../db/schema/index.js"  (db/ is still at root level)
```

**Step 3: Update `drizzle.config.ts` if schema path changed**

The schema stays at `./db/schema/index.ts` — no change needed.

**Step 4: Verify no broken imports**

```bash
pnpm exec tsc --noEmit 2>&1 | head -50
# Fix any import errors found
```

**Step 5: Commit**

```bash
git add lib/
git commit -m "refactor: move business logic from server/ to lib/"
```

---

### Task 3: Move frontend code from `client/src/` to `app/` and `components/`

**Files:**
- Move: `client/src/api.ts` → `lib/api.ts`
- Move: `client/src/lib/*` → `lib/client/*` (rename to avoid collision with backend lib/)
- Move: `client/src/components/*` → `components/*`
- Move: `client/src/pages/*` → `app/(dashboard)/*` and `app/login/*`
- Move: `client/src/locales/*` → `locales/*`
- Move: `client/src/main.tsx` → delete (Next.js uses app/layout.tsx)
- Move: `client/src/App.tsx` → delete (replaced by app/ routing)
- Move: `client/src/index.css` → `app/globals.css`

**Interfaces:**
- Consumes: Task 2 (lib/ structure)
- Produces: all frontend code accessible from app/ and components/

**Step 1: Move API client**

```bash
cp client/src/api.ts lib/api.ts
```

Edit `lib/api.ts` — the file uses `@shared/types` which needs updating:
```ts
// Change: import type { ... } from "@shared/types";
// To:     import type { ... } from "@/shared/types";
```

**Step 2: Move client lib utilities**

```bash
mkdir -p lib/client
cp client/src/lib/utils.ts lib/client/utils.ts
cp client/src/lib/datetime.ts lib/client/datetime.ts
cp client/src/lib/themes.ts lib/client/themes.ts
cp client/src/lib/i18n.ts lib/client/i18n.ts
cp client/src/lib/validatePassword.ts lib/client/validatePassword.ts
cp client/src/lib/useIsMobile.ts lib/client/useIsMobile.ts
cp client/src/lib/use-now.ts lib/client/use-now.ts
cp client/src/lib/useBingWallpaper.ts lib/client/useBingWallpaper.ts
```

**Step 3: Move shared components**

```bash
mkdir -p components/ui
cp client/src/components/Layout.tsx components/Layout.tsx
cp client/src/components/BrandIcons.tsx components/BrandIcons.tsx
cp client/src/components/AccountListPage.tsx components/AccountListPage.tsx
cp client/src/components/StatCard.tsx components/StatCard.tsx
cp client/src/components/Skeleton.tsx components/Skeleton.tsx
cp client/src/components/NavigationProgress.tsx components/NavigationProgress.tsx
cp client/src/components/NavigatingOverlay.tsx components/NavigatingOverlay.tsx
cp client/src/components/ThemeProvider.tsx components/ThemeProvider.tsx
cp client/src/components/useTheme.ts components/useTheme.ts
cp client/src/components/ui/card.tsx components/ui/card.tsx
cp client/src/components/ui/badge.tsx components/ui/badge.tsx
cp client/src/components/ui/separator.tsx components/ui/separator.tsx
cp client/src/components/ui/ConfirmDialog.tsx components/ui/ConfirmDialog.tsx
cp client/src/components/ui/Portal.tsx components/ui/Portal.tsx
cp client/src/components/ui/PasswordHints.tsx components/ui/PasswordHints.tsx
```

**Step 4: Move locales**

```bash
mkdir -p locales
cp client/src/locales/en.json locales/en.json
cp client/src/locales/zh.json locales/zh.json
```

**Step 5: Move CSS**

```bash
cp client/src/index.css app/globals.css
```

**Step 6: Move page components**

```bash
# Overview (has subdirectory with components)
mkdir -p app/\(dashboard\)/overview
cp client/src/pages/Overview/index.tsx app/\(dashboard\)/overview/page.tsx
cp client/src/pages/Overview/useOverviewData.ts app/\(dashboard\)/overview/useOverviewData.ts
cp client/src/pages/Overview/XSection.tsx app/\(dashboard\)/overview/XSection.tsx
cp client/src/pages/Overview/GitHubSection.tsx app/\(dashboard\)/overview/GitHubSection.tsx
cp client/src/pages/Overview/GitLabSection.tsx app/\(dashboard\)/overview/GitLabSection.tsx
cp client/src/pages/Overview/RedditSection.tsx app/\(dashboard\)/overview/RedditSection.tsx
cp client/src/pages/Overview/RepoChip.tsx app/\(dashboard\)/overview/RepoChip.tsx
cp client/src/pages/Overview/constants.ts app/\(dashboard\)/overview/constants.ts

# Platform list pages
mkdir -p app/\(dashboard\)/x
cp client/src/pages/X.tsx app/\(dashboard\)/x/page.tsx
mkdir -p app/\(dashboard\)/github
cp client/src/pages/GitHub.tsx app/\(dashboard\)/github/page.tsx
mkdir -p app/\(dashboard\)/gitlab
cp client/src/pages/GitLab.tsx app/\(dashboard\)/gitlab/page.tsx
mkdir -p app/\(dashboard\)/reddit
cp client/src/pages/Reddit.tsx app/\(dashboard\)/reddit/page.tsx

# Detail pages
mkdir -p app/\(dashboard\)/x/\[id\]
cp client/src/pages/XDetail.tsx app/\(dashboard\)/x/\[id\]/page.tsx
mkdir -p app/\(dashboard\)/github/\[id\]
cp client/src/pages/GitHubDetail.tsx app/\(dashboard\)/github/\[id\]/page.tsx
mkdir -p app/\(dashboard\)/github/\[accountId\]/repos/\[repoId\]
cp client/src/pages/RepoDetail.tsx app/\(dashboard\)/github/\[accountId\]/repos/\[repoId\]/page.tsx
mkdir -p app/\(dashboard\)/gitlab/\[id\]
cp client/src/pages/GitLabDetail.tsx app/\(dashboard\)/gitlab/\[id\]/page.tsx
mkdir -p app/\(dashboard\)/gitlab/\[accountId\]/projects/\[projectId\]
cp client/src/pages/ProjectDetail.tsx app/\(dashboard\)/gitlab/\[accountId\]/projects/\[projectId\]/page.tsx
mkdir -p app/\(dashboard\)/reddit/\[id\]
cp client/src/pages/RedditDetail.tsx app/\(dashboard\)/reddit/\[id\]/page.tsx

# Accounts, Admin, Settings
cp client/src/pages/AccountsPage.tsx app/\(dashboard\)/accounts/page.tsx
mkdir -p app/\(dashboard\)/admin
cp client/src/pages/Admin.tsx app/\(dashboard\)/admin/page.tsx
mkdir -p app/\(dashboard\)/settings
cp client/src/pages/Settings.tsx app/\(dashboard\)/settings/page.tsx

# Login (public, not in (dashboard) group)
mkdir -p app/login
cp client/src/pages/Login.tsx app/login/page.tsx
```

**Step 7: Update imports in all moved files**

Global find-and-replace patterns across all files in `app/`, `components/`, `lib/`:

| Old Import | New Import |
|-----------|-----------|
| `from "@/lib/api"` | `from "@/lib/api"` (unchanged) |
| `from "react-router-dom"` | `from "next/navigation"` (hooks) or `from "next/link"` (Link) |
| `from "@/components/..."` | `from "@/components/..."` (unchanged) |
| `from "@/lib/..."` | `from "@/lib/client/..."` (for client utilities like cn, themes, i18n) |
| `from "@shared/types"` | `from "@/shared/types"` |

For each page component, add `"use client";` as the first line.

**Step 8: Commit**

```bash
git add app/ components/ lib/api.ts lib/client/ locales/ app/globals.css
git commit -m "refactor: migrate frontend code to Next.js app/ structure"
```

---

### Task 4: Create Providers and update root layout

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css` (import path update if needed)

**Interfaces:**
- Consumes: Task 3 (components, lib/client)
- Produces: working providers for React Query, Theme, i18n

**Step 1: Create `app/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 3 * 60_000 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
```

**Step 2: Update `app/layout.tsx`**

```tsx
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Dashboard",
  description: "Multi-platform social & code dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 3: Verify i18n initialization**

Check `lib/client/i18n.ts` — ensure the import path for locale files is correct:
```ts
// Should point to the new locales/ directory location
// The i18next init may need path adjustments for locale JSON imports
```

**Step 4: Commit**

```bash
git add app/layout.tsx app/providers.tsx
git commit -m "feat: add providers and root layout for Next.js"
```

---

## Phase 2: Auth Middleware

### Task 5: Implement Next.js Middleware with JWT auth

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `jose` library (already installed), `dash_session` cookie name
- Produces: auth guard that redirects unauthenticated users and blocks unauthorized API calls

**Step 1: Write `middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "dash_session";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/reddit/callback",
  "/api/bing-wallpaper",
  "/api/health",
];

const PUBLIC_PAGE_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
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

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  // API routes — return 401 if no token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Validate JWT — Edge Runtime compatible via jose
    try {
      const secret = new TextEncoder().encode(process.env.DASHBOARD_SECRET);
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
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

  // Validate JWT for page routes too
  try {
    const secret = new TextEncoder().encode(process.env.DASHBOARD_SECRET);
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
  } catch {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 2: Test middleware**

```bash
pnpm dev
# Visit http://localhost:3000 — should redirect to /login
# Visit http://localhost:3000/api/health — should return { status: "ok" }
# Visit http://localhost:3000/api/accounts — should return 401
```

**Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Next.js middleware with JWT auth guard"
```

---

## Phase 3: API Routes

### Task 6: Create auth API routes

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/change-password/route.ts`

**Interfaces:**
- Consumes: `@/lib/auth` (verifyCredentials, verifyPassword, changePassword), `@/lib/crypto` (getJwtSecret), `@/lib/config` (loadConfig)
- Produces: identical auth API endpoints

**Step 1: Create `lib/auth-helpers.ts` — shared JWT utilities for Route Handlers**

```ts
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "./crypto";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function createSessionToken(username: string, role: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ sub: username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function validateSession(token: string): Promise<{ username: string; role: string } | null> {
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

export { SESSION_MAX_AGE };
```

**Step 2: Create `app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyCredentials, verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_MAX_AGE } from "@/lib/auth-helpers";

const SESSION_COOKIE = "dash_session";

// Rate limiter (in-memory, per IP)
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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const { username, password } = await req.json();

    // Multi-user login
    if (username && username !== "admin") {
      const result = await verifyCredentials(username, password || "");
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 800));
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const token = await createSessionToken(username, result.role || "user");
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
      });
      return NextResponse.json({ ok: true, user: username, role: result.role });
    }

    // Legacy admin login
    const valid = await verifyPassword(password);
    if (!valid) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const token = await createSessionToken("admin", "admin");
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    });
    return NextResponse.json({ ok: true, user: "admin", role: "admin" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
```

**Step 3: Create `app/api/auth/me/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("dash_session")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const session = await validateSession(token);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, username: session.username, role: session.role });
}
```

**Step 4: Create `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("dash_session", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
```

**Step 5: Create `app/api/auth/change-password/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    const ok = await changePassword(currentPassword, newPassword);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
```

**Step 6: Test auth routes**

```bash
pnpm dev
# POST /api/auth/login with valid credentials → should set cookie and return { ok: true }
# GET /api/auth/me with cookie → should return { authenticated: true, ... }
# POST /api/auth/logout → should clear cookie
```

**Step 7: Commit**

```bash
git add lib/auth-helpers.ts app/api/auth/
git commit -m "feat: add auth API routes (login, me, logout, change-password)"
```

---

### Task 7: Create user management and utility API routes

**Files:**
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[id]/route.ts`
- Create: `app/api/health/route.ts`
- Create: `app/api/bing-wallpaper/route.ts`
- Create: `app/api/confirm/token/route.ts`
- Create: `app/api/fetch/[id]/route.ts`

**Interfaces:**
- Consumes: `@/lib/services/users` (getUsers, createUser, deleteUser), `@/lib/http` (fetchWithConfig), `@/lib/services/accounts` (getAccountById, updateAccount), `@/lib/fetcher` + fetchers
- Produces: user management, health check, bing wallpaper proxy, manual fetch trigger

**Step 1: Create `app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
```

**Step 2: Create `app/api/users/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { getUsers, createUser } from "@/lib/services/users";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ users: await getUsers() });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { username, password, role } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "username and password required" }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  try {
    const user = await createUser(username, password, role || "user");
    const pub = Object.fromEntries(Object.entries(user).filter(([k]) => k !== "password_hash"));
    return NextResponse.json(pub, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

**Step 3: Create `app/api/users/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { deleteUser } from "@/lib/services/users";
import { validateConfirmToken } from "@/lib/confirm-helpers";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  if (userId === 1) return NextResponse.json({ error: "Cannot delete the bootstrap admin" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return NextResponse.json({ error: "Invalid or expired confirmation token" }, { status: 400 });
  }
  await deleteUser(userId);
  return NextResponse.json({ ok: true });
}
```

**Step 4: Create `lib/confirm-helpers.ts`**

```ts
// Ported from server/routes/confirm.ts
const tokens = new Map<string, number>();

export function createConfirmToken(): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  tokens.set(token, Date.now() + 5 * 60_000);
  return token;
}

export function validateConfirmToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token);
  return true;
}
```

**Step 5: Create `app/api/confirm/token/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createConfirmToken } from "@/lib/confirm-helpers";

export async function POST() {
  return NextResponse.json({ token: createConfirmToken() });
}
```

**Step 6: Create `app/api/bing-wallpaper/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWithConfig } from "@/lib/http";

export async function GET() {
  try {
    const res = await fetchWithConfig("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch wallpaper" }, { status: 502 });
    const data = (await res.json()) as { images?: { url: string }[] };
    const img = data.images?.[0];
    if (!img) return NextResponse.json({ error: "No image" }, { status: 502 });
    return NextResponse.redirect(`https://www.bing.com${img.url}`, 302);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
```

**Step 7: Create `app/api/fetch/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount } from "@/lib/services/accounts";
import { fetchAccount } from "@/lib/fetcher";
import { fetchGithubAccount } from "@/lib/fetchers/github";
import { fetchGitlabAccount } from "@/lib/fetchers/gitlab";
import { fetchRedditAccount, fetchRedditPublicAccount } from "@/lib/fetchers/reddit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountById(Number(id));
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!account.is_active) {
    await updateAccount(Number(id), { is_active: 1 });
    account.is_active = 1;
  }

  const fn =
    account.platform === "github"
      ? fetchGithubAccount
      : account.platform === "gitlab"
        ? fetchGitlabAccount
        : account.platform === "reddit"
          ? account.auth_type === "reddit_public"
            ? fetchRedditPublicAccount
            : fetchRedditAccount
          : fetchAccount;

  // Run in background — same pattern as Hono server
  fn(account as never).catch((e: unknown) =>
    console.error("Background fetch error:", e instanceof Error ? e.message : String(e))
  );
  return NextResponse.json({ ok: true, message: `Fetch started for @${account.screen_name}` });
}
```

**Step 8: Commit**

```bash
git add app/api/users/ app/api/health/ app/api/bing-wallpaper/ app/api/confirm/ app/api/fetch/ lib/confirm-helpers.ts
git commit -m "feat: add user management, health, wallpaper, confirm, and fetch API routes"
```

---

### Task 8: Create accounts API routes

**Files:**
- Create: `app/api/accounts/route.ts`
- Create: `app/api/accounts/[id]/route.ts`

**Interfaces:**
- Consumes: `@/lib/services/accounts` (getAccounts, getAccountById, createAccount, updateAccount, deleteAccount), `@/lib/confirm-helpers`, `@/lib/repositories/twitter` (getOverviewStats)
- Produces: account CRUD endpoints

**Step 1: Create `app/api/accounts/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { getAccounts, createAccount } from "@/lib/services/accounts";
import { getOverviewStats } from "@/lib/repositories/twitter";
import { getUserByUsername } from "@/lib/services/users";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;

  // Services filter by ownerId for non-admins; pass undefined for admin (gets all)
  const accounts = await getAccounts();
  const overview = await getOverviewStats();

  // Strip auth_token from response
  const safe = accounts.map(({ auth_token: _, ...rest }) => rest);
  return NextResponse.json({ accounts: safe, overview });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dash_session")?.value;
  const session = token ? await validateSession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { screenName, authToken, fetchInterval, platform, instanceUrl, authType } = body;
  if (!screenName || !authToken) {
    return NextResponse.json({ error: "screenName and authToken required" }, { status: 400 });
  }

  // Get user ID from username
  const { getUserByUsername } = await import("@/lib/services/users");
  const user = await getUserByUsername(session.username);

  const account = await createAccount({
    screenName,
    authToken,
    fetchInterval: fetchInterval || 3600,
    platform: platform || "twitter",
    instanceUrl: instanceUrl || null,
    authType: authType || null,
    ownerId: user?.id,
  });

  const { auth_token: _, ...pub } = account;
  return NextResponse.json(pub, { status: 201 });
}
```

**Step 2: Create `app/api/accounts/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth-helpers";
import { getAccountById, updateAccount } from "@/lib/services/accounts";
import { deleteAccount } from "@/lib/services/accounts";
import { validateConfirmToken } from "@/lib/confirm-helpers";
import { getLatestUserStats } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountById(Number(id));
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getLatestUserStats(account.id);
  const { auth_token: _, ...rest } = account;
  return NextResponse.json({ ...rest, stats: stats || null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { screenName, authToken, fetchInterval, isActive, instanceUrl, authType } = body;

  const updates: Record<string, unknown> = {};
  if (screenName !== undefined) updates.screen_name = screenName;
  if (authToken !== undefined) updates.auth_token = authToken;
  if (fetchInterval !== undefined) updates.fetch_interval = fetchInterval;
  if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
  if (instanceUrl !== undefined) updates.instance_url = instanceUrl;
  if (authType !== undefined) updates.auth_type = authType;

  await updateAccount(Number(id), updates);
  const updated = await getAccountById(Number(id));
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { auth_token: _, ...pub } = updated;
  return NextResponse.json(pub);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken)) {
    return NextResponse.json({ error: "Invalid or expired confirmation token" }, { status: 400 });
  }
  await deleteAccount(Number(id));
  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/accounts/
git commit -m "feat: add accounts API routes (CRUD)"
```

---

### Task 9: Create Twitter/X stats and tweets API routes

**Files:**
- Create: `app/api/stats/overview/route.ts`
- Create: `app/api/stats/timeline/route.ts`
- Create: `app/api/stats/top/route.ts`
- Create: `app/api/stats/calendar/route.ts`
- Create: `app/api/tweets/route.ts`
- Create: `app/api/tweets/[id]/route.ts`

**Interfaces:**
- Consumes: `@/lib/repositories/twitter` (getOverviewStats, getTimeline, getTopTweets, getCalendarData, getTweets, getTweetById)
- Produces: Twitter/X stats and tweet endpoints

**Step 1: Create `app/api/stats/overview/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const accountIds = req.nextUrl.searchParams.get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const stats = await getOverviewStats(ids);
  return NextResponse.json(stats);
}
```

**Step 2: Create `app/api/stats/timeline/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const months = Number(req.nextUrl.searchParams.get("months")) || 6;
  const accountIds = req.nextUrl.searchParams.get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const data = await getTimeline(months, ids);
  return NextResponse.json(data);
}
```

**Step 3: Create `app/api/stats/top/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTopTweets } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const metric = req.nextUrl.searchParams.get("metric") || "favorite_count";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;
  const tweets = await getTopTweets(metric, limit);
  return NextResponse.json(tweets);
}
```

**Step 4: Create `app/api/stats/calendar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCalendarData } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const data = await getCalendarData(year);
  return NextResponse.json(data);
}
```

**Step 5: Create `app/api/tweets/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTweets } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const sort = sp.get("sort") || "created_at";
  const order = sp.get("order") || "desc";
  const search = sp.get("search") || undefined;
  const accountIds = sp.get("accountIds")?.split(",").map(Number);
  const isReply = sp.get("isReply") !== undefined ? Number(sp.get("isReply")) : undefined;

  const data = await getTweets(page, limit, sort, order, search, accountIds, isReply);
  return NextResponse.json(data);
}
```

**Step 6: Create `app/api/tweets/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTweetById } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tweet = await getTweetById(id);
  if (!tweet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tweet);
}
```

**Step 7: Commit**

```bash
git add app/api/stats/ app/api/tweets/
git commit -m "feat: add Twitter/X stats and tweets API routes"
```

---

### Task 10: Create GitHub API routes

**Files:**
- Create: `app/api/github/overview/[accountId]/route.ts`
- Create: `app/api/github/timeline/[accountId]/route.ts`
- Create: `app/api/github/contributions/[accountId]/route.ts`
- Create: `app/api/github/repos/pin/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/snapshots/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/clones/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/views/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/referrers/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/referrers/history/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/paths/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/paths/history/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/releases/route.ts`
- Create: `app/api/github/[accountId]/repos/[repoId]/releases/[releaseId]/assets/route.ts`

**Interfaces:**
- Consumes: `@/lib/repositories/github` (getGithubOverview, getGithubTimeline, getGithubContributions, setPinnedRepos, getGithubRepoSnapshots, getGithubTrafficClones, getGithubTrafficViews, getGithubReferrers, getGithubReferrerHistory, getGithubPaths, getGithubPathHistory, getGithubReleases, getGithubReleaseAssets)
- Produces: all GitHub data endpoints

**Step 1: Create `app/api/github/overview/[accountId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubOverview } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGithubOverview(Number(accountId));
  return NextResponse.json(data);
}
```

**Step 2: Create `app/api/github/timeline/[accountId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubTimeline } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGithubTimeline(Number(accountId));
  return NextResponse.json(data);
}
```

**Step 3: Create `app/api/github/contributions/[accountId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubContributions } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const year = req.nextUrl.searchParams.get("year") ? Number(req.nextUrl.searchParams.get("year")) : undefined;
  const data = await getGithubContributions(Number(accountId), year);
  return NextResponse.json(data);
}
```

**Step 4: Create `app/api/github/repos/pin/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { setPinnedRepos } from "@/lib/repositories/github";

export async function PUT(req: NextRequest) {
  const { accountId, repoIds } = await req.json();
  await setPinnedRepos(accountId, repoIds);
  return NextResponse.json({ ok: true });
}
```

**Step 5: Create `app/api/github/[accountId]/repos/[repoId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubRepoSnapshots } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const data = await getGithubRepoSnapshots(Number(accountId), Number(repoId));
  return NextResponse.json(data);
}
```

**Step 6: Create remaining GitHub repo detail routes**

Follow the same pattern for each:
- `snapshots/route.ts` → `getGithubRepoSnapshots`
- `clones/route.ts` → `getGithubTrafficClones`
- `views/route.ts` → `getGithubTrafficViews`
- `referrers/route.ts` → `getGithubReferrers`
- `referrers/history/route.ts` → `getGithubReferrerHistory`
- `paths/route.ts` → `getGithubPaths`
- `paths/history/route.ts` → `getGithubPathHistory`
- `releases/route.ts` → `getGithubReleases`
- `releases/[releaseId]/assets/route.ts` → `getGithubReleaseAssets`

Each follows the same pattern:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubXxx } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const data = await getGithubXxx(Number(accountId), Number(repoId));
  return NextResponse.json(data);
}
```

For `releases/[releaseId]/assets/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getGithubReleaseAssets } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const data = await getGithubReleaseAssets(Number(releaseId));
  return NextResponse.json(data);
}
```

**Step 7: Commit**

```bash
git add app/api/github/
git commit -m "feat: add GitHub API routes"
```

---

### Task 11: Create GitLab API routes

**Files:**
- Create: `app/api/gitlab/overview/[accountId]/route.ts`
- Create: `app/api/gitlab/timeline/[accountId]/route.ts`
- Create: `app/api/gitlab/contributions/[accountId]/route.ts`
- Create: `app/api/gitlab/projects/pin/route.ts`
- Create: `app/api/gitlab/[accountId]/projects/[projectId]/route.ts`
- Create: `app/api/gitlab/[accountId]/projects/[projectId]/snapshots/route.ts`
- Create: `app/api/gitlab/[accountId]/projects/[projectId]/releases/route.ts`

**Interfaces:**
- Consumes: `@/lib/repositories/gitlab` (getGitlabOverview, getGitlabTimeline, getGitlabContributions, setPinnedGitlabProjects, getGitlabProjectSnapshots, getGitlabReleases)
- Produces: all GitLab data endpoints

Same pattern as GitHub routes. Each file exports a `GET` function that extracts params and calls the corresponding repository function.

**Step 1: Create all GitLab routes**

Follow the exact same pattern as Task 10, using GitLab repository functions.

**Step 2: Commit**

```bash
git add app/api/gitlab/
git commit -m "feat: add GitLab API routes"
```

---

### Task 12: Create Reddit API routes

**Files:**
- Create: `app/api/reddit/overview/[accountId]/route.ts`
- Create: `app/api/reddit/timeline/[accountId]/route.ts`
- Create: `app/api/reddit/posts/[accountId]/route.ts`
- Create: `app/api/reddit/comments/[accountId]/route.ts`
- Create: `app/api/reddit/activity/[accountId]/route.ts`
- Create: `app/api/reddit/subreddits/[accountId]/route.ts`
- Create: `app/api/reddit/callback/route.ts`

**Interfaces:**
- Consumes: `@/lib/repositories/reddit` (getRedditOverview, getRedditTimeline, getRedditPosts, getRedditComments, getRedditDailyActivity, getRedditDailyCommentActivity, getRedditSubredditDistribution)
- Produces: all Reddit data endpoints

**Step 1: Create Reddit routes**

Same pattern as GitHub/GitLab. The `callback/route.ts` is for Reddit OAuth callback (if applicable — check current implementation).

**Step 2: Commit**

```bash
git add app/api/reddit/
git commit -m "feat: add Reddit API routes"
```

---

## Phase 4: Frontend Pages

### Task 13: Create dashboard layout and login page

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/(dashboard)/overview/page.tsx` (add "use client")
- Modify: All page files in `app/(dashboard)/` (add "use client", update imports)

**Interfaces:**
- Consumes: `@/components/Layout` (sidebar), `@/lib/client/i18n` (i18next)
- Produces: working dashboard layout with sidebar navigation

**Step 1: Create `app/(dashboard)/layout.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("@/components/Layout"), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}
```

**Step 2: Update `app/login/page.tsx`**

Add `"use client";` as first line. Update imports:
```tsx
"use client";
// ... existing Login component code
// Change: import { useTheme } from "@/components/useTheme";
// (no change needed if import path is already correct)
```

**Step 3: Add "use client" to all page components**

For each file in `app/(dashboard)/`, add `"use client";` as the first line:
- `overview/page.tsx`
- `accounts/page.tsx`
- `x/page.tsx`
- `x/[id]/page.tsx`
- `github/page.tsx`
- `github/[id]/page.tsx`
- `github/[accountId]/repos/[repoId]/page.tsx`
- `gitlab/page.tsx`
- `gitlab/[id]/page.tsx`
- `gitlab/[accountId]/projects/[projectId]/page.tsx`
- `reddit/page.tsx`
- `reddit/[id]/page.tsx`
- `admin/page.tsx`
- `settings/page.tsx`

**Step 4: Update navigation imports in all page files**

For each page file, replace react-router-dom imports:

| Old | New |
|-----|-----|
| `import { useParams } from "react-router-dom"` | `import { useParams } from "next/navigation"` |
| `import { useNavigate } from "react-router-dom"` | `import { useRouter } from "next/navigation"` |
| `import { useLocation } from "react-router-dom"` | `import { usePathname } from "next/navigation"` |
| `import { Link } from "react-router-dom"` | `import Link from "next/link"` |
| `<Link to="/x">` | `<Link href="/x">` |
| `useNavigate()` → `nav("/x")` | `useRouter()` → `router.push("/x")` |
| `useParams()` | `useParams()` (same API) |

**Step 5: Update `app/globals.css` import**

Ensure `app/layout.tsx` imports `./globals.css` (already done in Task 4).

**Step 6: Commit**

```bash
git add app/
git commit -m "feat: migrate frontend pages to Next.js App Router"
```

---

### Task 14: Update component imports

**Files:**
- Modify: all files in `components/` that import from `@/lib/` (client utilities)

**Interfaces:**
- Consumes: Task 3 (lib/client structure)
- Produces: all component imports resolve correctly

**Step 1: Update imports in all components**

Replace patterns:
| Old | New |
|-----|-----|
| `import { cn } from "@/lib/utils"` | `import { cn } from "@/lib/client/utils"` |
| `import { themes } from "@/lib/themes"` | `import { themes } from "@/lib/client/themes"` |
| `import { useTheme } from "@/lib/useTheme"` | `import { useTheme } from "@/components/useTheme"` |
| `import { formatDate } from "@/lib/datetime"` | `import { formatDate } from "@/lib/client/datetime"` |
| `import i18n from "@/lib/i18n"` | `import i18n from "@/lib/client/i18n"` |
| `import { useIsMobile } from "@/lib/useIsMobile"` | `import { useIsMobile } from "@/lib/client/useIsMobile"` |
| `import { useNow } from "@/lib/use-now"` | `import { useNow } from "@/lib/client/use-now"` |
| `import { useBingWallpaper } from "@/lib/useBingWallpaper"` | `import { useBingWallpaper } from "@/lib/client/useBingWallpaper"` |
| `import { validatePassword } from "@/lib/validatePassword"` | `import { validatePassword } from "@/lib/client/validatePassword"` |

**Step 2: Update component imports in page files**

Pages that import from `@/components/` should be fine (paths unchanged). But verify:
- `import { StatCard } from "@/components/StatCard"` — unchanged
- `import { Skeleton } from "@/components/Skeleton"` — unchanged
- `import { ConfirmDialog } from "@/components/ui/ConfirmDialog"` — unchanged
- `import { Card } from "@/components/ui/card"` — unchanged

**Step 3: Verify no broken imports**

```bash
pnpm exec tsc --noEmit 2>&1 | head -50
```

**Step 4: Commit**

```bash
git add components/ app/
git commit -m "fix: update all component and page imports for new directory structure"
```

---

## Phase 5: Scheduler and Startup

### Task 15: Create scheduler singleton and startup module

**Files:**
- Create: `lib/scheduler-singleton.ts`
- Create: `lib/startup.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `@/lib/scheduler` (startScheduler)
- Produces: scheduler starts automatically when app loads

**Step 1: Create `lib/scheduler-singleton.ts`**

```ts
import { startScheduler } from "./scheduler";

let started = false;

export function ensureScheduler() {
  if (!started) {
    started = true;
    startScheduler();
  }
}
```

**Step 2: Create `lib/startup.ts`**

```ts
import { ensureScheduler } from "./scheduler-singleton";

ensureScheduler();
```

**Step 3: Update `app/layout.tsx` to import startup**

```tsx
import "./globals.css";
import "@/lib/startup"; // Side-effect: starts scheduler
import { Providers } from "./providers";

export const metadata = {
  title: "Dashboard",
  description: "Multi-platform social & code dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add lib/scheduler-singleton.ts lib/startup.ts app/layout.tsx
git commit -m "feat: add scheduler singleton and startup module"
```

---

### Task 16: Initialize DB and crypto on startup

**Files:**
- Modify: `lib/startup.ts`

**Interfaces:**
- Consumes: `@/lib/setup` (bootstrap), `@/lib/config` (loadConfig), `@/lib/logger` (initLogger)
- Produces: DB connection, crypto keys, and logger initialized before requests

**Step 1: Update `lib/startup.ts`**

```ts
import { ensureScheduler } from "./scheduler-singleton";
import { bootstrap } from "./setup";
import { loadConfig } from "./config";
import { initLogger } from "./logger";

let initialized = false;

export async function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  await bootstrap();

  const cfg = loadConfig();
  initLogger(cfg.log);

  ensureScheduler();
}
```

**Step 2: Update `app/layout.tsx`**

Since `ensureInitialized` is async, we need to call it differently. The best approach for Next.js is to use a middleware or a server-side initialization pattern. However, since this is a self-hosted long-running process, we can use a top-level await in a module:

```ts
// lib/startup.ts
import { ensureScheduler } from "./scheduler-singleton";
import { bootstrap } from "./setup";
import { loadConfig } from "./config";
import { initLogger } from "./logger";

// Top-level await — runs once when module is first imported
await bootstrap();
const cfg = loadConfig();
initLogger(cfg.log);
ensureScheduler();
```

Then in `app/layout.tsx`:
```tsx
import "@/lib/startup"; // Top-level await: bootstrap + logger + scheduler
```

Note: Next.js supports top-level await in Server Components and their imported modules.

**Step 3: Commit**

```bash
git add lib/startup.ts app/layout.tsx
git commit -m "feat: initialize DB, crypto, logger, and scheduler on startup"
```

---

## Phase 6: Deployment Configuration

### Task 17: Update Dockerfile and deployment config

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.gitlab-ci.yml` (update path triggers)

**Interfaces:**
- Consumes: Next.js standalone build
- Produces: working Docker image

**Step 1: Update `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Build Next.js
COPY . .
RUN pnpm run build

# Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 2: Create `public/` directory if missing**

```bash
mkdir -p public
# Add favicon.ico or other static assets if needed
```

**Step 3: Update `docker-compose.yml`**

```yaml
services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
```

**Step 4: Update `.gitlab-ci.yml` path triggers**

Update the `rules:changes:paths` to include `app/`, `components/`, `lib/` instead of `client/`, `server/`:

```yaml
paths:
  - app/
  - components/
  - lib/
  - shared/
  - db/
  - scripts/
  - Dockerfile
  - package.json
  - next.config.ts
  - tsconfig.json
  - drizzle.config.ts
  - .gitlab-ci.yml
```

**Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .gitlab-ci.yml public/
git commit -m "chore: update Docker and CI config for Next.js"
```

---

### Task 18: Clean up old files and workspace config

**Files:**
- Delete: `client/` directory
- Delete: `server/` directory
- Delete: `pnpm-workspace.yaml`
- Modify: `package.json` (remove workspace-related scripts, update dependencies)

**Interfaces:**
- Consumes: all previous tasks complete
- Produces: clean project structure

**Step 1: Remove old directories**

```bash
rm -rf client/ server/
```

**Step 2: Update `package.json`**

Remove workspace-specific scripts and dependencies that are no longer needed:

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Remove dependencies that were only used by the old setup:
- `@hono/node-server` (Hono server runtime)
- `hono` (if not used elsewhere)
- `tsx` (was used to run server/index.ts)

Keep:
- `next`, `react`, `react-dom` (Next.js)
- `drizzle-orm`, `pg`, `@types/pg` (database)
- `argon2` (auth)
- `jose` (JWT)
- `twitter-api-v2`, `twitter-openapi-typescript` (Twitter fetcher)

**Step 3: Update `pnpm-lock.yaml`**

```bash
pnpm install
```

**Step 4: Verify no broken imports**

```bash
pnpm exec tsc --noEmit 2>&1 | head -50
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old client/ and server/ directories, clean up workspace"
```

---

## Phase 7: Verification

### Task 19: End-to-end verification

**Files:** none (testing only)

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified working application

**Step 1: Run type check**

```bash
pnpm typecheck
# Expected: no errors
```

**Step 2: Run lint**

```bash
pnpm lint
# Expected: no errors (fix any found)
```

**Step 3: Start dev server and test manually**

```bash
pnpm dev
```

Test checklist:
- [ ] http://localhost:3000 redirects to /login
- [ ] Login with admin credentials → redirects to /
- [ ] Overview page loads with data
- [ ] X/Twitter page loads
- [ ] GitHub page loads
- [ ] GitLab page loads
- [ ] Reddit page loads
- [ ] Accounts page loads
- [ ] Settings page loads
- [ ] Admin page loads (admin only)
- [ ] API calls work (check Network tab for /api/* requests)
- [ ] No console errors

**Step 4: Build for production**

```bash
pnpm build
# Expected: successful build with standalone output
```

**Step 5: Test production build**

```bash
pnpm start
# Open http://localhost:3000 — same test checklist as above
```

**Step 6: Run existing tests**

```bash
pnpm test
# Expected: existing server tests still pass (if they reference lib/ paths correctly)
```

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address type errors and lint issues from migration"
```

---

## Task Dependency Graph

```
Task 1 (scaffold) ──→ Task 2 (move business logic) ──→ Task 3 (move frontend)
                                                          │
                                                          ├──→ Task 4 (providers)
                                                          │
                                                          ├──→ Task 13 (dashboard layout)
                                                          │
                                                          └──→ Task 14 (update imports)
                                                                │
Task 1 ──→ Task 5 (middleware)                                │
                                                                │
Task 2 ──→ Task 6 (auth routes)                               │
           Task 7 (user/utility routes)                       │
           Task 8 (accounts routes)                           │
           Task 9 (twitter routes)                            │
           Task 10 (github routes)                            │
           Task 11 (gitlab routes)                            │
           Task 12 (reddit routes)                            │
                                                                │
Task 2 ──→ Task 15 (scheduler singleton)                      │
           Task 16 (startup init)                              │
                                                                │
All tasks ──→ Task 17 (Docker/deploy)                         │
All tasks ──→ Task 18 (cleanup)                               │
All tasks ──→ Task 19 (verification)
```
