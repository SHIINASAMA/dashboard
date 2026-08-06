# React Router Framework Mode (v7) — Research for a Next.js 16 Migration

**Date:** 2026-08-06
**Scope:** Primary-source research only (official React Router docs at reactrouter.com, the remix-run/react-router GitHub repo, official changelogs/release notes, npm registry metadata, and official Vite / Tailwind / shadcn / Next.js / Rollup / Node.js documentation). No code changes were made.
**Repo under evaluation:** `/Users/kaoru/Developer/dashboard` (Next.js 16 App Router, React 19.2.7, TypeScript, Tailwind CSS v4, @tanstack/react-query, react-i18next, Drizzle ORM, PostgreSQL, Docker `output: "standalone"`).

> **Version caveat (important for the decision):** The npm `latest` dist-tag for React Router is now **v8** (`react-router@8.3.0`, released 2026-07-22), while the v7 line is still maintained at **`react-router@7.18.2`** (released 2026-07-28). This document answers the questions as asked for **v7 Framework Mode** (the "React Router v7, Vite-based framework mode, formerly Remix" target), and explicitly notes where v8 changes the answer. The official docs are published per-version; v7 docs are pinned at `https://reactrouter.com/7.18.2/...`.

---

## 0. Version status as of 2026-08-06 (verified)

| Package | Version | Release date | Node requirement | React peer |
|---|---|---|---|---|
| `react-router` (npm `latest`) | **8.3.0** | 2026-07-22 | `>=22.22.0` | `>=19.2.7` |
| `react-router` (npm `version-7` dist-tag) | **7.18.2** | 2026-07-28 | `>=20.0.0` | `>=18` |
| `@react-router/dev@7.18.2` | 7.18.2 | — | `>=20.0.0` | peer `vite ^5.1 || ^6 || ^7 || ^8`, `typescript ^5.1 || ^6` |
| `@react-router/serve@7.18.2` | 7.18.2 | — | — | deps: `express ^4.19.2`, `morgan`, `compression`, `get-port`, `@react-router/node`, `@react-router/express`, `@mjackson/node-fetch-server` |
| v7.0.0 (first v7 release) | 7.0.0 | 2024-11-22 | — | — |
| v8.0.0 | 8.0.0 | 2026-06-17 | `>=22.22.0` | `>=19.2.7` |

Sources:
- npm registry metadata: `npm view react-router dist-tags --json` (`latest: 8.3.0`, `version-7: 7.18.2`), `npm view react-router@7.18.2 engines peerDependencies`, `npm view react-router@8.3.0 engines peerDependencies`, `npm view @react-router/dev@7.18.2 engines peerDependencies`, `npm view @react-router/serve@7.18.2 dependencies` (https://www.npmjs.com/package/react-router, https://www.npmjs.com/package/@react-router/dev, https://www.npmjs.com/package/@react-router/serve)
- GitHub releases: `react-router@7.18.2` published 2026-07-28 (https://github.com/remix-run/react-router/releases/tag/react-router@7.18.2), `react-router@8.3.0` published 2026-07-22 (https://github.com/remix-run/react-router/releases/tag/react-router@8.3.0), `react-router@7.0.0` published 2024-11-22 (https://github.com/remix-run/react-router/releases/tag/react-router@7.0.0)
- Official CHANGELOG: v8.0.0 section (https://github.com/remix-run/react-router/blob/main/CHANGELOG.md), v7 branch CHANGELOG v7.18.2 section (https://github.com/remix-run/react-router/blob/v7/CHANGELOG.md)

**v8 deltas that matter for this evaluation** (from the v8.0.0 changelog, https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800):
- Baseline: Node 22.22.0+, React/ReactDOM 19.2.7+, Vite 7+; published as ESM-only.
- All `future.v8_*` flags were removed/lifted to defaults, including **`v8_middleware` (middleware is always enabled in v8)** and `v8_viteEnvironmentApi`.
- `react-router-dom` package removed (use `react-router` / `react-router/dom`).
- Deprecated `meta` `data` fields removed (use `loaderData`).
- Pre-rendering now uses the Vite preview-server flow (old implementation replaced).
- `@react-router/serve` bumped Express from 4.21.2 to **5.2.1**.
- Official templates now target v8: the default `remix-run/react-router-templates` template pins `react-router@^8`, `vite@^8.0.3`, uses `react-router-serve ./build/server/index.js`, `@tailwindcss/vite`, and `resolve: { tsconfigPaths: true }` (https://github.com/remix-run/react-router-templates/tree/main/default; raw files: https://raw.githubusercontent.com/remix-run/react-router-templates/main/default/package.json, .../default/vite.config.ts, .../default/Dockerfile). A v7-era snapshot of the same template (May 2026, `react-router@7.16.0`, `node:20-alpine` Docker base) is at https://github.com/remix-run/react-router-templates/commit/a52084977fc8a4dee41f4e3a5236236af146f777 (raw: .../default/package.json, .../default/vite.config.ts, .../default/Dockerfile).

---

## 1. What exactly is React Router Framework Mode v7

### 1.1 Mode model
React Router v7 is "a multi-strategy router for React" with three additive modes: **Declarative** (`<BrowserRouter>`), **Data** (`createBrowserRouter` + `RouterProvider` with `loader`/`action`), and **Framework**. Framework Mode "wraps Data Mode with a Vite plugin to add the full React Router experience": type-safe `href`, type-safe Route Module API, intelligent code splitting, and SPA/SSR/static rendering strategies. The docs explicitly list "migrating from Next.js" as a Framework Mode use case (https://reactrouter.com/7.18.2/start/modes).

### 1.2 Scaffolding
Official install is template-based:
```shellscript
npx create-react-router@latest my-react-router-app
cd my-react-router-app
npm i
npm run dev
```
The dev server is Vite, at `http://localhost:5173`. Ready-to-deploy templates live in `remix-run/react-router-templates` and are selected with `--template` (https://reactrouter.com/7.18.2/start/framework/installation). Relevant templates for this repo: `default` (Node + Docker + SSR + Tailwind), `node-custom-server` (custom Express), and `node-postgres` (Postgres + Drizzle + custom Express) (https://reactrouter.com/7.18.2/start/framework/deploying).

### 1.3 Required files and route configuration
- **`app/routes.ts` is required** — "Configuration file that maps URL patterns to route modules" (https://reactrouter.com/7.18.2/api/framework-conventions/routes.ts). You export a `RouteConfig` array using helpers `route()`, `index()`, `layout()`, `prefix()`, and `relative()` from `@react-router/dev/routes`.
- **File-based routing is opt-in**: the `@react-router/fs-routes` package provides `flatRoutes()` (file-system convention) and can be mixed with config entries (https://reactrouter.com/7.18.2/api/framework-conventions/routes.ts, https://reactrouter.com/7.18.2/start/framework/routing). This is the direct analog of Next's `app/` file conventions, but it is *not* the default.
- **`app/root.tsx` is required** — the only required route; it owns the `<html>` document and renders `<Outlet />`, `<Scripts />`, `<ScrollRestoration />`, and (when using the `meta`/`links` exports) `<Meta />` and `<Links />`. It also supports an optional `Layout` export that wraps the root `Component`, `ErrorBoundary`, and `HydrateFallback` to avoid re-mounting the app shell (https://reactrouter.com/7.18.2/api/framework-conventions/root.tsx).
- **Route modules** (the files referenced in `routes.ts`) define behavior via exports: `default` (component), `loader`, `clientLoader`, `action`, `clientAction`, `middleware`, `clientMiddleware`, `ErrorBoundary`, `HydrateFallback`, `headers`, `handle`, `links`, `meta`, `shouldRevalidate` (https://reactrouter.com/7.18.2/start/framework/route-module).
- **`react-router.config.ts` is optional** and controls `appDirectory` (default `app`), `buildDirectory` (default `build`), `ssr` (default true), `prerender`, `serverBuildFile` (default `index.js`), `serverModuleFormat` (default `esm`), `serverBundles`, `future` flags, `presets`, `buildEnd`, etc. (https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts).
- **Route patterns**: dynamic segments `:param`, optional segments `:param?` / `edit?`, splats `*` (catch-all `route("*", "./catchall.tsx")` is the `not-found.tsx` analog) (https://reactrouter.com/7.18.2/start/framework/routing).

### 1.4 Type safety
React Router generates per-route types (`+types/<file>.d.ts`) into `.react-router/types/`, and you import `type { Route } from "./+types/route"` for `Route.LoaderArgs`, `Route.ComponentProps`, `Route.MetaArgs`, etc. Generated during `react-router dev`, or manually via `react-router typegen` (https://reactrouter.com/7.18.2/explanation/type-safety, https://reactrouter.com/7.18.2/api/other-api/dev).

---

## 2. Core data APIs and Next.js App Router mapping

### 2.1 Loaders and actions
- **`loader`** provides data to a route component before render; it runs on the server for document requests and client navigations (client navigations call it through an automatic `fetch`). It is removed from client bundles, so server-only APIs are safe. **`clientLoader`** runs in the browser and is the tool for client-only fetching or BFF-style direct-to-API fetching (https://reactrouter.com/7.18.2/start/framework/data-loading, https://reactrouter.com/7.18.2/how-to/client-data).
- Loader return values are serialized automatically; supported types include promises, maps, sets, dates, etc. The docs state: "We try to support the same set of serializable types that React permits server components to pass as props to client components" (https://reactrouter.com/7.18.2/start/framework/data-loading).
- **`action`** (server) and **`clientAction`** (browser) handle mutations. `clientAction` takes priority when both exist. After an action completes, "all loader data on the page is revalidated" automatically (https://reactrouter.com/7.18.2/start/framework/actions).
- **Hooks/components:** `useLoaderData()`, `useActionData()`, `Form`, `useSubmit`, `useFetcher`, `fetcher.Form`/`fetcher.submit` (https://reactrouter.com/7.18.2/api/hooks/useLoaderData, https://reactrouter.com/7.18.2/api/hooks/useActionData, https://reactrouter.com/7.18.2/api/hooks/useSubmit, https://reactrouter.com/7.18.2/api/hooks/useFetcher, https://reactrouter.com/7.18.2/start/framework/actions). `<Form>` is progressively enhanced: without JS it's a normal HTML form POST; with JS it uses `fetch` (https://reactrouter.com/7.18.2/api/components/Form).
- **`clientLoader.hydrate = true as const`** forces the client loader to run during hydration, and **`HydrateFallback`** renders a skeleton while it runs. `serverLoader()`/`serverAction()` are passed into client loaders/actions so both can be combined (https://reactrouter.com/7.18.2/start/framework/data-loading, https://reactrouter.com/7.18.2/how-to/client-data).

### 2.2 defer / streaming
"React Router supports React Suspense by returning promises from loaders and actions." The promise must be a **value inside an object** (a bare single promise is not allowed). Components render it with `<Await resolve={...}>` or, on React 19, `React.use(promise)` inside a `<Suspense>` boundary. Default timeout for outstanding promises is 4950 ms, configurable with a `streamTimeout` export in `entry.server.tsx` (https://reactrouter.com/7.18.2/how-to/suspense). This is the direct analog of Next's `defer()`/`Suspense` streaming.

### 2.3 Revalidation semantics
- After actions: all route loaders revalidate automatically (https://reactrouter.com/7.18.2/start/framework/actions).
- During client-side transitions React Router "optimizes reloading of routes that are already rendering, like not reloading layout routes that aren't changing"; form submissions and search-param changes reload all routes "to be safe" (https://reactrouter.com/7.18.2/how-to/optimize-revalidation).
- `shouldRevalidate({ ... })` lets a route opt out of revalidation; `useRevalidator()` triggers manual revalidation (https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/api/hooks/useRevalidator).

### 2.4 Caching
There is **no built-in `revalidateTag`/ISR tag cache**. Official mechanisms:
- **Client-side caching** via `clientLoader` + `clientAction` (memory/localStorage): load from server on the document request, `clientLoader.hydrate = true` to prime a cache, serve from cache on navigations, invalidate in `clientAction` (https://reactrouter.com/7.18.2/how-to/client-data).
- **HTTP caching** via the route `headers` export / `data(..., { headers: { "Cache-Control": "max-age=300, s-maxage=3600" } })` (https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/how-to/headers).
- **Build-time static data via prerendering** (below).

### 2.5 Prerendering / static generation (ISR/SSG analog)
`react-router.config.ts` supports:
```ts
export default {
  prerender: ["/", "/about", "/contact"],              // static array
  prerender: async ({ getStaticPaths }) => {...},       // dynamic (generateStaticParams analog)
  prerender: { paths: [...], concurrency: 4 },          // concurrency control
} satisfies Config;
```
"Pre-rendering is a build-time operation that generates static HTML and client navigation data payloads" — output is `build/client/[url].html` plus a `build/client/[url].data` payload for client-side navigation. The same route `loader` is executed at build time. With `ssr: true`, non-pre-rendered URLs are still server-rendered, so "you can pre-render some data at a single route while still server rendering the rest" (https://reactrouter.com/7.18.2/start/framework/rendering, https://reactrouter.com/7.18.2/how-to/pre-rendering, https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts). There is **no time-based ISR** (no `revalidate` seconds); stale-while-revalidate is a manual pattern (clientLoader cache + background refresh, or `Cache-Control: stale-while-revalidate` on loader responses).

### 2.6 Next.js App Router concept mapping (summary table)

| Next.js App Router | React Router v7 Framework Mode | Notes / citation |
|---|---|---|
| Server Components (RSC) | **No stable equivalent**; `loader` is the server data mechanism; RSC is experimental (`unstable_reactRouterRSC` + `@vitejs/plugin-rsc`) | https://reactrouter.com/7.18.2/how-to/react-server-components |
| Server Actions (`"use server"`) | `action` / `clientAction` (route module exports), or resource-route `action` for API endpoints | https://reactrouter.com/7.18.2/start/framework/actions |
| Route Handlers (`route.ts`) | **Resource routes**: a route module with `loader`/`action` and no default component; GET→`loader`, POST/PUT/PATCH/DELETE→`action` | https://reactrouter.com/7.18.2/how-to/resource-routes |
| `use client` | Not needed for route components; client-only modules via `*.client.ts`/`.client/`; server-only via `*.server.ts`/`.server/` | https://reactrouter.com/7.18.2/api/framework-conventions/client-modules, .../server-modules |
| `defer()` + `<Suspense>` | Return un-awaited promise as an object key in `loader` + `<Await>`/`React.use` + `<Suspense>` | https://reactrouter.com/7.18.2/how-to/suspense |
| `revalidateTag` / `revalidatePath` | **No direct equivalent**; `clientLoader` caching + `clientAction` invalidation, or `shouldRevalidate`, or HTTP `Cache-Control` | https://reactrouter.com/7.18.2/how-to/client-data, .../how-to/optimize-revalidation, .../how-to/headers |
| ISR / `generateStaticParams` | `prerender` config (array/function/object); `prerender: async ({ getStaticPaths })` | https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts |
| `export const dynamic = "force-dynamic"` | No per-route flag; with `ssr: true` loaders run per-request; avoid `prerender` for dynamic routes | https://reactrouter.com/7.18.2/start/framework/rendering |
| `cache()` / `unstable_cache()` | No built-in data cache; external caching in `.server.ts` modules (e.g., a DB/Redis/`Cache-Control` layer) | — (no official RR equivalent exists) |
| React Query on the client | Unchanged — `clientLoader`/`clientAction` can call APIs; QueryClientProvider works as a client component | https://reactrouter.com/7.18.2/api/framework-conventions/client-modules |

---

## 3. Server rendering & deployment

### 3.1 What `react-router build` produces
- `react-router build` "Builds your app for production with Vite" and sets `process.env.NODE_ENV=production` and minifies. Flags include `--minify` (default `"esbuild"`), `--profile` (starts the built-in Node.js inspector), `--sourcemapClient`, `--sourcemapServer`, `--assetsInlineLimit`, `--mode`, `--config` (https://reactrouter.com/7.18.2/api/other-api/dev).
- Output defaults to **`build/client/`** (static assets + prerendered HTML/data) and **`build/server/index.js`** (the Node server build; `serverBuildFile` defaults to `index.js`, `serverModuleFormat` defaults to `esm`, `buildDirectory` defaults to `build`). The official upgrade table shows the start command `react-router-serve build/server/index.js` (https://reactrouter.com/7.18.2/upgrading/remix, https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts, https://reactrouter.com/7.18.2/how-to/pre-rendering).
- `react-router build` **does not typecheck**; the official script for a typed build is `"typecheck": "react-router typegen && tsc"` (https://reactrouter.com/7.18.2/upgrading/remix).

### 3.2 Production server options
- **`@react-router/serve`** ("React Router App Server"): "a production-ready but basic Node.js server built with Express" using `compression`, `express.static` (serve-static), and `morgan`. Run with `react-router-serve <server-build-path>`. Configurable via `HOST` and `PORT` env vars. By design it is not customizable; for custom servers use `@react-router/express` (https://reactrouter.com/7.18.2/api/other-api/serve).
- **`@react-router/express`**: `createRequestHandler({ build, getLoadContext })` mounted with `app.all("*", ...)`; a custom server is a Vite-managed SSR input (`vite.config.ts` with `build.rollupOptions: isSsrBuild ? { input: "./server/app.ts" } : undefined` plus `virtual:react-router/server-build` for dev) (https://reactrouter.com/7.18.2/api/other-api/adapter).
- **`@react-router/node`**: not an adapter itself but "contains utilities for working with Node-based adapters" and is the home of Node-specific session storage (`createFileSessionStorage`). Node support policy: React Router "officially supports Active and Maintenance Node LTS versions" (https://reactrouter.com/7.18.2/api/other-api/adapter).
- There are also adapters for Cloudflare, Architect, and platform templates for Vercel/Netlify/etc. (https://reactrouter.com/7.18.2/api/other-api/adapter, https://reactrouter.com/7.18.2/start/framework/deploying).

### 3.3 `output: "standalone"` equivalent for Docker
- **There is no "tracing" step.** The RR server build is a single `build/server/index.js` plus `build/client/`; `@react-router/serve` serves both. The official **default Docker template** is a multi-stage build that copies `package.json`/lockfile + production `node_modules` and only the `build/` directory into the runtime image, then `CMD ["npm", "run", "start"]` where `start` is `react-router-serve ./build/server/index.js` (https://github.com/remix-run/react-router-templates/tree/main/default, raw Dockerfile at https://raw.githubusercontent.com/remix-run/react-router-templates/main/default/Dockerfile; v7-era version used `node:20-alpine` — https://raw.githubusercontent.com/remix-run/react-router-templates/a52084977fc8a4dee41f4e3a5236236af146f777/default/Dockerfile).
- Compare: Next.js `output: "standalone"` uses `@vercel/nft` file tracing to produce `.next/standalone` with a minimal `server.js` (https://nextjs.org/docs/app/api-reference/config/next-config-js/output). RR instead ships the full server build; you still deploy `node_modules` (or at least production deps), which is a different (simpler, larger) packaging model.
- The existing repo Dockerfile (`/Users/kaoru/Developer/dashboard/Dockerfile`) would change from copying `.next/standalone` + `.next/static` to copying `build/` + prod `node_modules`, with `CMD ["node", "node_modules/.bin/react-router-serve", "./build/server/index.js"]` (or a custom Express server for the Hono-style `/api` surface).

### 3.4 Vite dev server
`react-router dev` runs the Vite dev server with HMR **and Hot Data Revalidation (HDR)**: HMR updates client code; HDR re-fetches loader data when server-side code changes, keeping app state (https://reactrouter.com/7.18.2/api/other-api/dev). The default port is 5173 (https://reactrouter.com/7.18.2/start/framework/installation). Dev mode behavior under `@react-router/serve` purges the `require` cache every request (module scope is reset per request); production boots once (https://reactrouter.com/7.18.2/api/other-api/serve).

### 3.5 Node version required
- v7: `node >=20.0.0` per npm `engines`; docs state "React Router v7 requires ... `node@20`, `react@18`" (https://reactrouter.com/7.18.2/upgrading/remix). LTS policy: Active + Maintenance LTS (https://reactrouter.com/7.18.2/api/other-api/adapter). This repo's Docker image is `node:22-slim` — fine for v7.
- v8: `node >=22.22.0` (npm engines + https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800).

---

## 4. Middleware

### 4.1 React Router v7 middleware API
- **Opt-in in v7** via `future.v8_middleware: true` in `react-router.config.ts` (always enabled in v8) (https://reactrouter.com/7.18.2/how-to/middleware, https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800).
- **API:** `export const middleware: Route.MiddlewareFunction[] = [...]` in any route module. Middleware "runs in a nested chain, executing from parent routes to child routes ... then from child routes back to parent routes" after the Response is generated. `next()` continues down the chain; on the leaf route it runs the loaders/actions. **If you don't call `next()`, the request auto-continues** (a convenience for auth guards).
- **Context:** `createContext<T>()` from `react-router` plus `RouterContextProvider`; middleware sets values with `context.set(userContext, user)` and loaders/actions read with `context.get(userContext)`. With the flag enabled, a custom server's `getLoadContext` must return a `RouterContextProvider` instance instead of a plain object (https://reactrouter.com/7.18.2/how-to/middleware, https://reactrouter.com/7.18.2/api/utils/RouterContextProvider).
- **Official auth pattern:**
```tsx
async function authMiddleware({ request, context }) {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (!userId) {
    throw redirect("/login");
  }
  const user = await getUserById(userId);
  context.set(userContext, user);
}
export const middleware = [authMiddleware];
```
(https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/how-to/middleware)
- There is a documented AsyncLocalStorage pattern for request-scoped state, and middleware can post-process responses (e.g., add security headers, CMS redirect on 404) (https://reactrouter.com/7.18.2/how-to/middleware).
- **`clientMiddleware`** is the browser-side equivalent (no `Response` return) (https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/how-to/middleware).

### 4.2 Comparison to Next.js middleware (`proxy.ts` here)
This repo's `/Users/kaoru/Developer/dashboard/proxy.ts` uses `NextRequest`/`NextResponse` from `next/server` (edge middleware), matches paths manually (`/_next`, `/assets`, public API paths, `/login`), reads the `dash_session` cookie, validates with `jose` `jwtVerify`, and either passes through, returns `NextResponse.json(..., { status: 401 })`, or redirects to `/login?from=...`.

Mapping to React Router v7:
- There is **no separate edge middleware file and no `matcher` config**. Instead, middleware is exported from route modules. For app-wide gating, export `middleware` from `app/root.tsx`; for subsets, add it to a `layout()` branch (the `(dashboard)` route group would become a `layout("./dashboard/layout.tsx", [...])` branch, and `/api/*` would be a set of resource routes or a catch-all `route("api/*", ...)` with middleware).
- `NextRequest`/`NextResponse` → standard Web `Request`/`Response` (`request.headers`, `new Response(JSON.stringify(...), { status: 401, headers })`).
- `req.cookies.get(...)` → `request.headers.get("Cookie")` + `createCookie`/`createCookieSessionStorage` parsing (https://reactrouter.com/7.18.2/explanation/sessions-and-cookies).
- `NextResponse.redirect(loginUrl)` → `throw redirect("/login?from=" + pathname)` (https://reactrouter.com/7.18.2/api/utils/redirect).
- 401 JSON for `/api/*` → `throw data({ error: "Unauthorized" }, { status: 401 })` (or `new Response`) (https://reactrouter.com/7.18.2/how-to/status).
- JWT validation with `jose` runs identically inside the middleware function; put the secret handling in a `*.server.ts` module (https://reactrouter.com/7.18.2/api/framework-conventions/server-modules).
- **Runtime difference:** Next middleware runs on the edge runtime; React Router v7 middleware is Node server middleware that runs before loaders/actions (there is no edge runtime for middleware in v7; v8's Cloudflare support is via a different adapter/plugin — https://reactrouter.com/7.18.2/how-to/middleware, https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800). For this self-hosted Docker deployment that is not a regression.

---

## 5. Headers, cookies, redirects

### 5.1 Server-side APIs
- **Reading request headers:** `request` in `loader`/`action`/`middleware` is a standard Web Fetch `Request`; `request.headers.get("Cookie")`, `.has(...)`, etc. (https://reactrouter.com/7.18.2/how-to/headers).
- **Setting response headers:**
  - Route module `headers` export returning `Headers` or `HeadersInit` (e.g., CSP, `X-Frame-Options`, `Cache-Control`) (https://reactrouter.com/7.18.2/how-to/headers).
  - `data(value, init)` from loaders/actions to attach status/headers, then explicitly return them from the route `headers` export (`loaderHeaders`/`actionHeaders` args) — **except `Set-Cookie`, which is automatically preserved from parents** even without a `headers` export (https://reactrouter.com/7.18.2/api/utils/data, https://reactrouter.com/7.18.2/how-to/headers).
  - `entry.server.tsx` `handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext)` for global headers (https://reactrouter.com/7.18.2/how-to/headers, https://reactrouter.com/7.18.2/api/framework-conventions/entry.server.tsx).
  - Parent/child header merging: the deepest route's headers win; merge with `parentHeaders.append/set` when both are needed (https://reactrouter.com/7.18.2/how-to/headers).

### 5.2 Cookies and sessions
- **`createCookie(name, options)`** — a logical container for a browser cookie; attributes `path`, `sameSite`, `httpOnly`, `secure`, `expires`, `maxAge`, `secrets`; `cookie.parse(header)`, `cookie.serialize(value)` (https://reactrouter.com/7.18.2/api/utils/createCookie, https://reactrouter.com/7.18.2/explanation/sessions-and-cookies).
- **`createCookieSessionStorage<SessionData, SessionFlashData>({ cookie })`** returns `{ getSession, commitSession, destroySession }`. `getSession(request.headers.get("Cookie"))` reads; `commitSession(session)` produces the `Set-Cookie` header; `destroySession(session)` clears it. Official login/logout examples set the cookie via `redirect(..., { headers: { "Set-Cookie": await commitSession(session) } })` (https://reactrouter.com/7.18.2/explanation/sessions-and-cookies).
- Signing: `secrets: ["s3cret1"]` signs/verifies cookie contents; rotate by prepending new secrets (https://reactrouter.com/7.18.2/explanation/sessions-and-cookies).
- Other storages: `createMemorySessionStorage`, `createSessionStorage`, Node `createFileSessionStorage` (`@react-router/node`) (https://reactrouter.com/7.18.2/api/utils/createSessionStorage, https://reactrouter.com/7.18.2/explanation/sessions-and-cookies, https://reactrouter.com/7.18.2/api/other-api/adapter).

### 5.3 Redirects and status
- `redirect(url, init?)` — a `Response` with `Location`; **defaults to 302 Found**; accepts absolute URLs (https://reactrouter.com/7.18.2/api/utils/redirect).
- `redirectDocument(url, init?)` — same but "will force a document reload to the new location" (used for logout where the session cookie must be cleared) (https://reactrouter.com/7.18.2/api/utils/redirectDocument).
- `data(value, init)` — a `DataWithResponseInit` carrying data + status/headers without forcing a raw `Response`; `throw data("Not Found", { status: 404 })` triggers the nearest `ErrorBoundary` (https://reactrouter.com/7.18.2/api/utils/data, https://reactrouter.com/7.18.2/how-to/status).

### 5.4 httpOnly cookie auth + JWT validation (this repo)
The existing flow (`dash_session` httpOnly cookie containing a JWT, validated with `jose`) maps cleanly:
- Read: `request.headers.get("Cookie")` in a root-route `middleware` (or per-route loader), parse with `createCookie("dash_session", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", secrets: [...] })`, then `jwtVerify(token, JWT_SECRET_KEY, { algorithms: ["HS256"] })`.
- Reject: `throw data({ error: "Unauthorized" }, { status: 401 })` for `/api/*`; `throw redirect("/login?from=" + pathname)` for pages.
- Set/clear: on login/logout, `redirect("/", { headers: { "Set-Cookie": ... } })` or `redirectDocument` for logout.
- The `jose` import and secret handling belong in a `*.server.ts` module so they never reach the client bundle (https://reactrouter.com/7.18.2/api/framework-conventions/server-modules).

---

## 6. Streaming / Suspense on the server

- **Supported.** "React Router supports React Suspense by returning promises from loaders and actions" — return the promise (not awaited) as an object key; render with `<Await resolve={...}>` or React 19's `React.use(promise)` inside `<Suspense>` (https://reactrouter.com/7.18.2/how-to/suspense).
- Default `streamTimeout` is 4950 ms; override with `export const streamTimeout = 10_000` in `entry.server.tsx` (https://reactrouter.com/7.18.2/how-to/suspense).
- The default Node entry uses `renderToPipeableStream` with `onShellReady`/`onShellError`; non-Node runtimes use `renderToReadableStream`; both are visible after `npx react-router reveal` (https://reactrouter.com/7.18.2/api/framework-conventions/entry.server.tsx).
- **Node gotcha (documented):** a streamed promise that rejects *before all loaders settle* becomes an unhandled promise rejection and crashes the Node process unless you register `process.on("unhandledRejection", ...)` in `entry.server.ts` (https://reactrouter.com/7.18.2/how-to/suspense).
- React 19 is fully supported in v7 (peer `react >=18`; this repo already uses `react@19.2.7`), so `React.use`-based streaming works.

---

## 7. i18n and theming integration

- **No official React Router guide exists** for react-i18next or theme providers (searched the full v7 doc tree; styling docs cover CSS only: https://reactrouter.com/main/explanation/styling). The guidance below follows from official framework mechanics: route modules render on both server and client, and hydration must not mismatch.
- **Server/client code separation is the official mechanism:** files ending `.client.ts` (or in `.client/` dirs) are removed from server bundles (values are `undefined` on the server, so use them in `useEffect`/event handlers); `.server.ts` files are excluded from client bundles and the build **fails** if server code leaks into the client graph. Route modules themselves must **not** be `.server`/`.client` (https://reactrouter.com/7.18.2/api/framework-conventions/client-modules, https://reactrouter.com/7.18.2/api/framework-conventions/server-modules).
- **react-i18next:** this repo's pattern (`lib/client/i18n.ts` initializes i18next with a browser `LanguageDetector` only when `typeof window !== "undefined"`, plus `app/providers.tsx` deferring the client shell via `useSyncExternalStore`) works unchanged in React Router Framework Mode, because Providers is a client-side component tree rendered into the root route. Recommended specifics:
  - Keep the SSR default language stable (`lng: "en"` on the server) so SSR and first client render agree; run the detector on the client only.
  - Set `<html lang={...}>` in `app/root.tsx` (or the root `Layout` export) and use `suppressHydrationWarning` where the attribute depends on client state — this is exactly what the official root route docs show with `lang="en"` (https://reactrouter.com/7.18.2/api/framework-conventions/root.tsx).
  - If the detector module is imported by server code, gate it as the repo already does; alternatively move detector initialization into a `*.client.ts` module.
- **Theming:** `ThemeProvider` using `localStorage` + `useEffect` is the standard hydration-safe pattern and needs no framework-specific changes. For SSR-correct initial theme (avoiding a flash), the root route `Layout` export can read `useRouteLoaderData("root")` and render a `<style>` with `:root { --themeVar: ... }` — this is a documented example in the root route docs (https://reactrouter.com/7.18.2/api/framework-conventions/root.tsx).
- **Hydration caveats:** the same rules as Next client components apply — no `window`/`localStorage` during render on the server; use `HydrateFallback`/`useSyncExternalStore` for client-only initial state; React 19 built-in `<meta>`/`<title>`/`<link>` are hoisted, which matters for document `<head>` consistency (https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/explanation/hydration).

---

## 8. Tailwind CSS v4 integration with Vite and shadcn/ui

### 8.1 Tailwind CSS v4
Official Vite install (https://tailwindcss.com/docs/installation/using-vite):
```bash
npm install tailwindcss @tailwindcss/vite
```
```ts
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
});
```
and `@import "tailwindcss";` in your CSS. The docs state the plugin is "the most seamless way to integrate it with frameworks like Laravel, SvelteKit, **React Router**, Nuxt, and SolidJS", and there is **no `tailwind.config` file in the instructions** (Tailwind v4 is CSS-first). The official React Router template does exactly this: `plugins: [tailwindcss(), reactRouter()]` (https://raw.githubusercontent.com/remix-run/react-router-templates/main/default/vite.config.ts). This repo already uses `tailwindcss@^4.3.2`; the only change is swapping `@tailwindcss/postcss` + `postcss.config.mjs` for the `@tailwindcss/vite` plugin in `vite.config.ts`.

### 8.2 shadcn/ui-style components
Official shadcn/ui Vite installation (https://ui.shadcn.com/docs/installation/vite):
- Run the CLI: `npx shadcn@latest init`, then `npx shadcn@latest add <component>`.
- The `@/*` alias must exist in `tsconfig.json` (and `tsconfig.app.json`) via `baseUrl` + `paths`; Vite needs the alias resolved too (`resolve.alias` with `path.resolve(__dirname, "./src")` in `vite.config.ts`) and `@types/node` installed for `path`.
- Components are copied into the repo as source files; there is no build-time codegen/config step. Because this repo's components are already source files driven by Tailwind CSS variables, they work identically in a Vite build. Note: React Router's own type generation also needs `rootDirs` in tsconfig (see §11).

---

## 9. Build memory characteristics

### 9.1 What is documented (and what is not)
- **There is no official React Router (or Vite) documentation comparing Vite/Rollup build memory to Next.js webpack builds.** GitHub searches of `remix-run/react-router` for `"out of memory"` return only an old, closed v6-era troubleshooting issue (#6498); searches for `"max-old-space-size"` and `memory build` return no results (https://github.com/remix-run/react-router/issues/6498; search URLs: https://github.com/remix-run/react-router/issues?q=%22out+of+memory%22, https://github.com/remix-run/react-router/issues?q=%22max-old-space-size%22). The only related maintainer note is issue #12721 "Typegen high CPU/Memory usage" (closed; Node v22.12 typegen file-watcher regression, not build memory) (https://github.com/remix-run/react-router/issues/12721).
- **What can be cited instead:**
  - Vite's `build.minify` default is `'oxc'` for the client build and `false` for the SSR build; Oxc minifier is "30~90x faster than terser and only 0.5~2% worse compression" (https://vite.dev/config/build-options).
  - `build.terserOptions.maxWorkers` defaults to the number of CPUs minus 1; `build.reportCompressedSize` (default true) can be disabled to "increase build performance for large projects"; `build.chunkSizeWarningLimit` default 500 kB (https://vite.dev/config/build-options).
  - Rollup's `maxParallelFileOps` (default 1000) "limits the number of files that can be read or written in parallel" to prevent `EMFILE: too many open files` — this is an open-file-handle limit, not a memory knob (https://rollupjs.org/configuration-options/#maxparallelfileops).
  - `NODE_OPTIONS=--max-old-space-size` is standard Node CLI behavior for capping/raising the V8 heap (https://nodejs.org/api/cli.html#--max-old-space-size-size-in-megabytes). The repo's Dockerfile already uses `NODE_OPTIONS=--max-old-space-size=256` (tsc/install) and `352` (next build) with `--child-concurrency=1` (https://nodejs.org/api/cli.html).
  - `react-router build --profile` starts the Node inspector for build profiling (https://reactrouter.com/7.18.2/api/other-api/dev).
  - `prerender: { paths, concurrency }` limits parallel prerender workers (https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts).

### 9.2 React Router's own build process
- `react-router build` is a Vite production build (client bundle + SSR bundle) (https://reactrouter.com/7.18.2/api/other-api/dev). It does **not run a separate typecheck step** — the official script table requires `react-router typegen && tsc` for type checking, i.e., typegen is a separate CLI command (https://reactrouter.com/7.18.2/upgrading/remix, https://reactrouter.com/7.18.2/api/other-api/dev). Typegen runs automatically during `react-router dev`.
- **No webpack build-worker concept exists** — there is no RR equivalent of Next's `experimental.webpackBuildWorker`/`webpackMemoryOptimizations`. Next.js 16's official memory-usage guidance is webpack-specific: `experimental.webpackMemoryOptimizations`, `experimental.webpackBuildWorker: false`, disabling webpack cache, `next build --experimental-debug-memory-usage`, and `experimental.preloadEntriesOnStart` (https://nextjs.org/docs/app/guides/memory-usage). The repo currently relies on those knobs (`next.config.ts`: `cpus: 1`, `webpackBuildWorker: false`, `webpackMemoryOptimizations: true`).
- Practical expectations, stated as inference rather than official claims: Vite builds use esbuild/Oxc/Rollup (native minification/transpilation) rather than webpack's JS minifier, and the project can keep `NODE_OPTIONS` heap caps plus `--child-concurrency=1` in CI. Because `react-router build` runs client + SSR bundles in one process, peak memory is still driven by Rollup/Oxc; on a memory-limited CI, keep `NODE_OPTIONS=--max-old-space-size` and disable `reportCompressedSize` if slow, but no official low-memory CI guide exists for React Router.

---

## 10. Migration path from Next.js App Router

### 10.1 Official migration guide status
- **There is no official Next.js → React Router migration guide.** The only official mention is the modes doc listing "migrating from Next.js" as a reason to choose Framework Mode (https://reactrouter.com/7.18.2/start/modes). The official upgrade guides cover Remix v2 → v7 and v6 → v7 (https://reactrouter.com/7.18.2/upgrading/remix, https://reactrouter.com/7.18.2/upgrading/v6). The mapping below is synthesized from primary API docs.

### 10.2 Feature-by-feature mapping

| Next.js App Router (this repo) | React Router v7 equivalent | Citation |
|---|---|---|
| `app/` file tree + `page.tsx` | `app/routes.ts` config + route modules (or `flatRoutes()` file convention) | https://reactrouter.com/7.18.2/start/framework/routing, https://reactrouter.com/7.18.2/api/framework-conventions/routes.ts |
| `app/layout.tsx` (root) | `app/root.tsx` (required, owns `<html>`) | https://reactrouter.com/7.18.2/api/framework-conventions/root.tsx |
| `app/(dashboard)/layout.tsx` route group | `layout("./dashboard/layout.tsx", [...])` pathless layout helper | https://reactrouter.com/7.18.2/start/framework/routing |
| Nested `page.tsx` under segments | `route("a/b", "./x.tsx")` nested children + `<Outlet />` | https://reactrouter.com/7.18.2/start/framework/routing |
| `next/link` `Link` | `Link` from `react-router` (plus `NavLink`, `prefetch`, `discover`, `reloadDocument`) | https://reactrouter.com/7.18.2/api/components/Link, https://reactrouter.com/7.18.2/start/framework/navigating |
| `useRouter()` (`next/navigation`) | `useNavigate()` (client-side imperative navigation) | https://reactrouter.com/7.18.2/api/hooks/useNavigate, https://reactrouter.com/7.18.2/start/framework/navigating |
| `usePathname()` | `useLocation()` (`.pathname`), or `useMatches()` for the full match tree | https://reactrouter.com/7.18.2/api/hooks/useMatches |
| `useParams()` | `useParams()` (same name) | https://reactrouter.com/7.18.2/api/hooks/useParams |
| `redirect()` from `next/navigation` (server) | `redirect()` from `react-router` inside loaders/actions (returns a 302 `Response`); in client components use `useNavigate` | https://reactrouter.com/7.18.2/api/utils/redirect, https://reactrouter.com/7.18.2/start/framework/navigating |
| `notFound()` | `throw data("Not Found", { status: 404 })` or `throw new Response("Page not found", { status: 404 })` in a loader | https://reactrouter.com/7.18.2/how-to/status, https://reactrouter.com/7.18.2/start/framework/routing |
| `cookies()` from `next/headers` | `request.headers.get("Cookie")` + `createCookieSessionStorage`/`createCookie` | https://reactrouter.com/7.18.2/explanation/sessions-and-cookies |
| `headers()` from `next/headers` | `request.headers` (read), route `headers` export / `data()` / `entry.server.tsx` (write) | https://reactrouter.com/7.18.2/how-to/headers |
| Route handlers (`app/api/.../route.ts`) | Resource routes (module with `loader`/`action`, no default component) | https://reactrouter.com/7.18.2/how-to/resource-routes |
| `middleware.ts` (`proxy.ts` here) | `export const middleware` in route modules (see §4) | https://reactrouter.com/7.18.2/how-to/middleware |
| `next/image` | **No direct equivalent** (no built-in image optimizer) — use plain `<img>` or Vite asset imports; this repo already uses `<img>` with `// eslint-disable-next-line @next/next/no-img-element` comments | https://vite.dev/guide/assets |
| `metadata`/`generateMetadata` | `meta`/`links` exports (synchronous, receive `loaderData`-derived args) or React 19 built-in `<title>`/`<meta>`/`<link>` (recommended) | https://reactrouter.com/7.18.2/start/framework/route-module, https://reactrouter.com/7.18.2/api/framework-conventions/root.tsx |
| `export const dynamic = "force-dynamic"` (in `app/layout.tsx`) | No per-route flag; `ssr: true` (default) means loaders run per-request; exclude the route from `prerender` | https://reactrouter.com/7.18.2/start/framework/rendering |
| `instrumentation.ts` `register()` | `instrumentations` array in `entry.server.tsx` (handler/route wrappers; read-only) — or startup code in a custom server | https://reactrouter.com/7.18.2/how-to/instrumentation |
| `next/font` | No direct equivalent (system/self-hosted CSS `@font-face` or Vite asset imports) | — (no official RR font API) |
| `output: "standalone"` | `react-router build` → `build/server/index.js` + `@react-router/serve` (or `@react-router/express`); Docker template copies `build/` | §3.3, https://reactrouter.com/7.18.2/api/other-api/serve |

### 10.3 Next.js features with NO direct equivalent
1. **Stable React Server Components / Server Functions** — RSC in React Router is experimental (`unstable_reactRouterRSC` plugin, `@vitejs/plugin-rsc`, `entry.rsc/entry.ssr/entry.browser`) (https://reactrouter.com/7.18.2/how-to/react-server-components).
2. **`revalidateTag`/`revalidatePath` and time-based ISR** — no tag-based cache; use `clientLoader` caching, `shouldRevalidate`, or HTTP `Cache-Control` (https://reactrouter.com/7.18.2/how-to/client-data, https://reactrouter.com/7.18.2/how-to/optimize-revalidation, https://reactrouter.com/7.18.2/how-to/headers).
3. **`generateMetadata` (async)** — `meta`/`links` are synchronous functions; composition is manual (arrays are replaced, not merged) (https://reactrouter.com/7.18.2/start/framework/route-module).
4. **`next/image` optimization pipeline** — no built-in image optimizer/resizing/CDN; use `<img>`/Vite assets.
5. **`next/font`** — no built-in font loading API.
6. **Next middleware edge runtime + `matcher` config** — RR middleware runs in the Node server process and is attached to routes, not matched by a config file (https://reactrouter.com/7.18.2/how-to/middleware).
7. **`output: "standalone"` file tracing (`@vercel/nft`)** — RR ships the full server build; you deploy `build/` + prod `node_modules` (https://nextjs.org/docs/app/api-reference/config/next-config-js/output, https://reactrouter.com/7.18.2/api/other-api/serve).
8. **`process.env.NEXT_RUNTIME` / Next-specific build-time guards** — Vite uses `import.meta.env` and `.server`/`.client` modules instead (https://vite.dev/guide/env-and-mode, https://reactrouter.com/7.18.2/api/framework-conventions/server-modules).

---

## 11. Gotchas

1. **React 19 compatibility:** v7 peer is `react >=18`; React 19.2.7 (this repo) is supported. v8 requires React 19.2.7+ and Node 22.22+ (npm `peerDependencies`/`engines`; https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800). If you adopt v7 now, the React/Node floor is already satisfied for a later v8 move.
2. **TypeScript `moduleResolution: "bundler"` is fine**, but React Router requires tsconfig changes: include `.react-router/types/**/*` in `include`, add `rootDirs: [".", "./.react-router/types"]`, set `types` to include `@react-router/node` + `vite/client`, and gitignore `.react-router/` (https://reactrouter.com/7.18.2/upgrading/remix, https://reactrouter.com/7.18.2/explanation/type-safety). The repo's tsconfig has `module: "esnext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"` — compatible; the `next` plugin entry must be removed.
3. **Path aliases (`@/*`, `@shared/*`):** the repo's tsconfig `paths` are not automatically understood by Vite. Official examples use `vite-tsconfig-paths` (https://reactrouter.com/7.18.2/api/other-api/adapter, https://reactrouter.com/7.18.2/upgrading/remix), Vite 8's native `resolve: { tsconfigPaths: true }` (official default template, https://raw.githubusercontent.com/remix-run/react-router-templates/main/default/vite.config.ts), or explicit `resolve.alias` (shadcn Vite docs, https://ui.shadcn.com/docs/installation/vite).
4. **Env vars:** `process.env.NEXT_PUBLIC_*` must become `VITE_*` accessed as `import.meta.env.VITE_*`; Vite exposes only `VITE_`-prefixed vars to client code and statically replaces them at build time. Secrets must never use the `VITE_` prefix. `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` are loaded (https://vite.dev/guide/env-and-mode). Server-side `process.env` still works in the Node server runtime.
5. **`public/` directory:** maps directly — `public/` (default `<root>/public`) is served at `/` in dev and copied to `dist` root as-is (https://vite.dev/guide/assets). `publicDir` is configurable.
6. **Dev proxy:** use `server.proxy` in `vite.config.ts` (extends `http-proxy-3`) for the Hono/API backend in dev; `server.middlewareMode` exists for embedding Vite in an existing server (https://vite.dev/config/server-options).
7. **SSR-only vs client-only code:** `.server` files/dirs are stripped from client bundles (build fails if leaked); `.client` files/dirs are removed from the server build; route modules must not be `.server`/`.client` (https://reactrouter.com/7.18.2/api/framework-conventions/server-modules, https://reactrouter.com/7.18.2/api/framework-conventions/client-modules). `process.env.NEXT_RUNTIME === "nodejs"` guards in this repo (`instrumentation.ts`, `lib/startup.ts`) have no meaning in RR — replace with `.server` modules and the instrumentation API.
8. **Instrumentation/startup:** official `instrumentations` array in `entry.server.tsx`/`entry.client.tsx` with `handler.instrument({ request })`, `route.instrument({ loader/action/middleware })` (read-only wrappers) (https://reactrouter.com/7.18.2/how-to/instrumentation). Startup/bootstrap logic can also live in `entry.server.tsx` module scope or a custom Express server.
9. **Scheduler/cron in the Node server:** production boots once, but under `@react-router/serve` dev mode the module cache is purged per request — "any values in the module scope will be reset" (the repo already uses a `scheduler-singleton.ts` guard, which is the documented workaround: "If you need a workaround for preserving cache in development, you can set up a singleton in your server") (https://reactrouter.com/7.18.2/api/other-api/serve).
10. **Streaming:** register a `process.on("unhandledRejection", ...)` handler when streaming promises can reject before all loaders settle (https://reactrouter.com/7.18.2/how-to/suspense).
11. **CSRF/origin checks:** since v7.18.0, CSRF checks inspect the `host` in the request URL; behind a reverse proxy you may need `allowedActionOrigins` or `trust proxy` (https://github.com/remix-run/react-router/blob/v7/CHANGELOG.md#v7180, https://reactrouter.com/7.18.2/api/framework-conventions/react-router.config.ts).
12. **i18n/theming hydration:** see §7 — keep SSR output stable, use `.client` modules for browser-only detectors, and reuse the existing `useSyncExternalStore` hydration guard.
13. **`process.env.NODE_ENV`:** Vite statically replaces `process.env.NODE_ENV` as well as `import.meta.env.MODE`/`DEV`/`PROD`; the repo's i18n dev-only missing-key logging should use `import.meta.env.DEV` for clarity (https://vite.dev/guide/env-and-mode).
14. **Meta/links merging:** `meta` arrays are replaced, not merged — build composition explicitly if needed (https://reactrouter.com/7.18.2/start/framework/route-module).

---

## 12. Repo-specific observations (grounding, not code changes)

- `/Users/kaoru/Developer/dashboard` is Next.js 16 (`next@^16.2.10`), React 19.2.7, Tailwind v4.3.2, TS `moduleResolution: "bundler"`, path aliases `@/*` and `@shared/*`; Dockerfile uses `output: "standalone"` + `NODE_OPTIONS` heap caps + `--child-concurrency=1`; `next.config.ts` sets `serverExternalPackages`, `experimental.cpus: 1`, `webpackBuildWorker: false`, `webpackMemoryOptimizations: true`.
- Auth: `proxy.ts` gates `/api/*` and pages with the `dash_session` httpOnly JWT cookie (jose); API surface is `app/api/*` route handlers (auth, accounts, users, stats, fetch, github, gitlab, reddit, bing-wallpaper, health, confirm). In RR these become resource routes and/or an `/api` route branch with root/route middleware.
- Navigation APIs in use: `next/navigation` (`useRouter`, `usePathname`, `useParams`, `redirect`), `next/link`, `next/headers` `cookies()` in `app/api/*/route.ts`. Images are plain `<img>` (no `next/image`), so no image-pipeline migration is needed.
- Startup: `instrumentation.ts` + `lib/startup.ts` bootstrap and start a scheduler guarded by `NEXT_RUNTIME === "nodejs"` — maps to RR instrumentation/`entry.server.tsx` startup with a singleton guard.

---

## 13. Primary source index (all URLs verified 200 on 2026-08-06 unless noted)

- React Router v7 docs (versioned): https://reactrouter.com/7.18.2/start/framework/installation · /routing · /route-module · /data-loading · /actions · /navigating · /rendering · /deploying · /start/modes · /api/framework-conventions/routes.ts · /root.tsx · /react-router.config.ts · /entry.server.tsx · /server-modules · /client-modules · /api/other-api/dev · /serve · /adapter · /api/hooks/useLoaderData · /useActionData · /useSubmit · /useNavigate · /useMatches · /useRevalidator · /api/utils/data · /redirect · /redirectDocument · /createCookie · /createCookieSessionStorage · /RouterContextProvider · /api/components/Link · /Form · /explanation/sessions-and-cookies · /type-safety · /how-to/middleware · /headers · /client-data · /optimize-revalidation · /pre-rendering · /resource-routes · /suspense · /status · /instrumentation · /react-server-components · /upgrading/remix · /upgrading/future
- React Router changelogs/releases: https://github.com/remix-run/react-router/blob/main/CHANGELOG.md · https://github.com/remix-run/react-router/blob/v7/CHANGELOG.md · https://github.com/remix-run/react-router/releases/tag/react-router@7.0.0 · .../react-router@7.18.2 · .../react-router@8.3.0
- React Router templates: https://github.com/remix-run/react-router-templates (default template files cited in §0/§3/§8)
- npm registry: https://www.npmjs.com/package/react-router · https://www.npmjs.com/package/@react-router/dev · https://www.npmjs.com/package/@react-router/serve (metadata verified via `npm view`)
- Vite: https://vite.dev/guide/env-and-mode · https://vite.dev/config/server-options · https://vite.dev/config/build-options · https://vite.dev/guide/assets
- Tailwind CSS: https://tailwindcss.com/docs/installation/using-vite
- shadcn/ui: https://ui.shadcn.com/docs/installation/vite
- Next.js (comparison): https://nextjs.org/docs/app/api-reference/config/next-config-js/output · https://nextjs.org/docs/app/guides/memory-usage
- Rollup: https://rollupjs.org/configuration-options/#maxparallelfileops
- Node.js: https://nodejs.org/api/cli.html#--max-old-space-size-size-in-megabytes
