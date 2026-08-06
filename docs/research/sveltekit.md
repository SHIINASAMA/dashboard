# SvelteKit (Svelte 5) Migration Research

- **Date**: 2026-08-06
- **Scope**: Evaluate migrating the dashboard (currently Next.js 16 App Router, React 19, TypeScript, Tailwind v4, @tanstack/react-query, react-i18next, Drizzle ORM + PostgreSQL, Docker standalone) to SvelteKit (Svelte 5).
- **Method**: Primary sources only — official docs at svelte.dev / kit.svelte.dev (which redirects to svelte.dev/docs/kit/*), official GitHub repos (sveltejs/kit, sveltejs/svelte, sveltejs/cli), official blogs/changelogs, npm registry metadata, and official library docs (Tailwind, shadcn-svelte, TanStack Query, Lucide, Vite). Every claim below carries a URL. No code changes were made.

---

## 1. Current stable versions, Node requirement, scaffold

### Versions (npm registry, `latest` tag, checked 2026-08-06)

| Package | Latest stable | Published | Node engines | Source |
|---|---|---|---|---|
| `@sveltejs/kit` | **2.70.2** | 2026-07-29 | `>=18.13` | https://registry.npmjs.org/@sveltejs/kit |
| `svelte` (Svelte 5) | **5.56.8** | 2026-07-24 | `>=18` | https://registry.npmjs.org/svelte |
| `@sveltejs/adapter-node` | **5.5.7** | 2026-06-24 | (none declared) | https://registry.npmjs.org/@sveltejs/adapter-node |
| `sv` (CLI) | **0.17.0** | 2026-07-31 | — | https://registry.npmjs.org/sv |
| `create-svelte` | **7.0.1** (deprecated) | 2025-08-07 | — | https://registry.npmjs.org/create-svelte (deprecation notice: use `sv`) |
| `vite` | **8.2.0** | 2026-07-30 | `^20.19.0 || >=22.12.0` | https://registry.npmjs.org/vite |
| `@sveltejs/vite-plugin-svelte` | **7.2.0** | 2026-07-07 | `^20.19 || ^22.12 || >=24`; peer `vite ^8.0.0-beta.7 || ^8.0.0`, `svelte ^5.46.4` | https://registry.npmjs.org/@sveltejs/vite-plugin-svelte |

- SvelteKit 3 is **not stable** as of 2026-08-06: `@sveltejs/kit` `next` dist-tag is `3.0.0-next.14` (https://registry.npmjs.org/@sveltejs/kit). Svelte 5's `next` tag is `5.0.0-next.272`, but `latest` is 5.56.8 (https://registry.npmjs.org/svelte).
- Beware: the unscoped `vite-plugin-svelte` npm package is a stale legacy package (latest 3.0.1, peer deps `vite >=0.20.8 <2.0.0`, `svelte ^3.0.0` — https://registry.npmjs.org/vite-plugin-svelte). The real plugin is `@sveltejs/vite-plugin-svelte` (https://registry.npmjs.org/@sveltejs/vite-plugin-svelte).
- **There is no `@sveltejs/adapter-standalone`** — npm returns 404 for that name (https://registry.npmjs.org/@sveltejs/adapter-standalone). It is a common misconception inherited from Next.js "standalone output"; SvelteKit's equivalent is `@sveltejs/adapter-node`.

### Node version requirement

- `@sveltejs/kit` declares `node: >=18.13` (https://registry.npmjs.org/@sveltejs/kit), `svelte` declares `node: >=18` (https://registry.npmjs.org/svelte).
- However, a fresh scaffold installs Vite 8: `@sveltejs/kit` 2.70.2's peer range is `vite ^5.0.3 || ^6.0.0 || ^7.0.0-beta.0 || ^8.0.0` (https://registry.npmjs.org/@sveltejs/kit) and `@sveltejs/vite-plugin-svelte` 7.2.0 peer-requires `vite ^8.0.0-beta.7 || ^8.0.0` + `svelte ^5.46.4` (https://registry.npmjs.org/@sveltejs/vite-plugin-svelte). Vite 8 requires `node: ^20.19.0 || >=22.12.0` (https://registry.npmjs.org/vite). **Practical floor for a new scaffold: Node 20.19+ or 22.12+ (Node 22 is fully supported).**

### What a scaffolded project looks like

- Create with `npx sv create` (official CLI docs: https://svelte.dev/docs/cli#sv-create). Templates: `minimal`, `demo`, `library`; TypeScript is default (`--types ts` uses `.ts` files and `lang="ts"` in `.svelte` files; `--types jsdoc` uses JSDoc) (https://svelte.dev/docs/cli#sv-create).
- Official add-ons installed via `sv add` / `sv create --add`: `ai-tools`, `better-auth`, `drizzle`, `eslint`, `mdsvex`, `paraglide`, `playwright`, `prettier`, `storybook`, `sveltekit-adapter`, `tailwindcss`, `vitest` (https://svelte.dev/docs/cli#Official-add-ons).
- Official project structure (https://svelte.dev/docs/kit/project-structure):
  - `src/lib/` (importable via the `$lib` alias; `src/lib/server/` is server-only)
  - `src/routes/` (file-based routes)
  - `src/app.html` (page template with placeholders `%sveltekit.head%`, `%sveltekit.body%`, `%sveltekit.assets%`, `%sveltekit.nonce%`, `%sveltekit.env.[NAME]%`, `%sveltekit.version%`)
  - `src/hooks.client.js` / `src/hooks.server.js`
  - `src/instrumentation.server.js` (observability, experimental opt-in)
  - `src/service-worker.js`, `src/error.html`, `static/`, `tests/`
  - `package.json`, `svelte.config.js`, `vite.config.js`, `tsconfig.json`
- Routes are filesystem-based: `+page.svelte` (page), `+layout.svelte` (layout), `+server.js`/`+server.ts` (endpoint), `+error.svelte` (error boundary), `+page.server.js`, `+layout.server.js`, `+page.js`, `+layout.js` (https://svelte.dev/docs/kit/routing, https://svelte.dev/docs/kit/project-structure).
- `svelte.config.js` with adapter (classic form, from official adapter docs):

  ```js
  // svelte.config.js
  import adapter from '@sveltejs/adapter-node';
  export default {
    kit: { adapter: adapter() }
  };
  ```
  (https://svelte.dev/docs/kit/adapter-node)

- Since SvelteKit 2.62.0 you can also pass configuration directly to the `sveltekit()` plugin in `vite.config.js`, in which case `svelte.config.js` is ignored (https://svelte.dev/docs/kit/configuration). `sv`-created projects keep their config inside `vite.config.js` and ship no `svelte.config.js` (https://svelte.dev/docs/cli#sv-add). The SvelteKit 3.0 prerelease moves to "you must pass configuration directly" (noted in the `sveltekit()` plugin reference at https://svelte.dev/docs/kit/configuration).
- `package.json` must include `@sveltejs/kit`, `svelte` and `vite` as devDependencies, and `sv` scaffolds set `"type": "module"` (https://svelte.dev/docs/kit/project-structure).
- Environment variables: only vars prefixed with `PUBLIC_` are exposed to client code (default `publicPrefix: "PUBLIC_"`); server-only imports come from `$env/static/private` / `$env/dynamic/private` (https://svelte.dev/docs/kit/environment-variables, https://svelte.dev/docs/kit/configuration#env).

---

## 2. Core data APIs and mapping to Next.js App Router

### Load functions

- **Server load**: `src/routes/foo/+page.server.ts` exports `load` (type `PageServerLoad` from `./$types`); `+layout.server.ts` exports `LayoutServerLoad`. Server load receives `params`, `route`, `url`, `fetch`, `setHeaders`, `parent`, `depends`, `untrack`, plus `clientAddress`, `cookies`, `locals`, `platform`, `request` (https://svelte.dev/docs/kit/load).
- **Universal load**: `+page.ts` / `+layout.ts` export `load` (types `PageLoad` / `LayoutLoad`); it runs on the server during SSR and again in the browser during hydration/navigation; server `load` runs first and its return value is passed to the universal `load` as the `data` argument (https://svelte.dev/docs/kit/load).
- **Layout data merging**: layout `load` return values are merged down to pages; `parent()` lets a child load read parent data (https://svelte.dev/docs/kit/load).
- **Typing**: since SvelteKit 2.16.0, `let { data } = $props()` can be typed with `PageProps` / `LayoutProps` from `./$types`; earlier versions require `PageData` / `LayoutData` (https://svelte.dev/docs/kit/routing, https://svelte.dev/docs/kit/migrating-to-sveltekit-2).
- **Serialization**: server load data is serialized with `devalue` — JSON plus `BigInt`, `Date`, `Map`, `Set`, `RegExp`, cyclic refs — and **may include promises, which are streamed to the browser** (https://svelte.dev/docs/kit/load#Streaming-with-promises).

### Form actions

- `+page.server.ts` can export `actions` (named or `default`). Actions receive `event` (`request`, `cookies`, `locals`, `fetch`, `url`, `params`), can `return` data, `fail(status, data)` for validation errors, or `redirect(status, location)` (https://svelte.dev/docs/kit/form-actions).
- Progressive enhancement: `<form method="POST" use:enhance>`; `use:enhance` only works with `method="POST"` forms pointing at actions in `+page.server.js`; the callback receives `{ formElement, formData, action, cancel, submitter }` and can call `update({ invalidateAll, reset })` or use `applyAction` / `deserialize` from `$app/forms` (https://svelte.dev/docs/kit/form-actions, https://svelte.dev/docs/kit/$app-forms).
- Result is exposed as the `form` prop on the page and `page.form` / `page.status` in `$app/state` (https://svelte.dev/docs/kit/form-actions, https://svelte.dev/docs/kit/$app-state).

### Streaming

- SvelteKit streams nested promises returned from **server** `load` functions by default (since SvelteKit 1.8); the page renders before they resolve and `{#await}` shows a pending/loading branch (https://svelte.dev/blog/streaming-snapshots-sveltekit, https://svelte.dev/docs/kit/load#Streaming-with-promises).
- Top-level promises in the returned object are awaited automatically; only **nested** promises stream (https://svelte.dev/blog/streaming-snapshots-sveltekit).
- Promises returned from **universal** load are *not* streamed — the promise is recreated in the browser (https://svelte.dev/docs/kit/load#Streaming-with-promises).
- Streaming requires JavaScript; platforms without streaming support (e.g. AWS Lambda) buffer the response until all promises resolve (https://svelte.dev/blog/streaming-snapshots-sveltekit, https://svelte.dev/docs/kit/load#Streaming-with-promises).
- Once streaming starts, headers/status are fixed: you cannot `setHeaders` or `redirect()` inside a streamed promise (https://svelte.dev/docs/kit/load#Streaming-with-promises).

### Cache / revalidation story (no built-in ISR)

- SvelteKit has **no built-in ISR / static regeneration**. The official docs note that tools built solely for SSG "may scale the prerendering process more efficiently during build when rendering a very large number of pages," and that ISR exists only via the Vercel adapter (`config.isr`) — https://svelte.dev/docs/kit/introduction, https://svelte.dev/blog/streaming-snapshots-sveltekit ("Incremental static regeneration on Vercel"), https://svelte.dev/docs/kit/adapter-vercel.
- What exists instead:
  - **Static prerendering** at build time: `export const prerender = true | 'auto'` (or false) in `+page(.server).js` / `+layout(.server).js` / `+server.js`; `'auto'` keeps the route in the SSR manifest while also emitting static files; `config.kit.prerender` controls `entries`, `crawl` (default true) and `concurrency` (default 1) (https://svelte.dev/docs/kit/page-options, https://svelte.dev/docs/kit/configuration#prerender).
  - **SSR** per route: `export const ssr = true | false`; **CSR/SPA**: `export const csr`, and SPA mode via `ssr = false` plus a fallback page or `adapter-static` with `fallback` (https://svelte.dev/docs/kit/page-options, https://svelte.dev/docs/kit/single-page-apps).
  - **HTTP caching via `setHeaders`**: in a server `load`, `setHeaders({ 'cache-control': ... })` sets response headers (it is a no-op in the browser, and cannot set `set-cookie` — use `cookies`) (https://svelte.dev/docs/kit/load#setHeaders). CDN/reverse-proxy caching is the official way to get time-based revalidation.
  - **Client-side data invalidation**: `depends('id')` in load + `invalidate('id')` / `invalidateAll()` from `$app/navigation` reruns load functions (https://svelte.dev/docs/kit/load#Invalidation, https://svelte.dev/docs/kit/$app-navigation).
  - **Build-time guard**: `building` from `$app/environment` is `true` during `vite build`/prerendering so startup code can be skipped (https://svelte.dev/docs/kit/$app-environment, https://svelte.dev/docs/kit/load#Rerunning-load-functions).

### Mapping to Next.js App Router

| Next.js App Router | SvelteKit equivalent |
|---|---|
| Server Components / `page.tsx` + `page.ts` (server data) | `+page.svelte` + `+page.server.ts` `load` (SSR by default) |
| Layouts (`layout.tsx`) | `+layout.svelte` + `+layout.server.ts` / `+layout.ts` `load` |
| `generateStaticParams` + static generation | `prerender = true/'auto'` + `entries`/`entries()` (https://svelte.dev/docs/kit/page-options) |
| ISR | **No built-in equivalent**; `config.isr` only on Vercel adapter; otherwise CDN `cache-control` via `setHeaders` (https://svelte.dev/blog/streaming-snapshots-sveltekit, https://svelte.dev/docs/kit/load#setHeaders) |
| `revalidateTag` / `revalidatePath` | No server-side tag revalidation; client-side `invalidate()` / `invalidateAll()` reruns load functions (https://svelte.dev/docs/kit/$app-navigation) |
| Route Handlers (`route.ts`) | `+server.ts` exporting `GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD` (https://svelte.dev/docs/kit/routing#server) |
| Server Actions | Form actions in `+page.server.ts` + `use:enhance` (https://svelte.dev/docs/kit/form-actions) |
| Middleware (`proxy.ts` / `middleware.ts`) | `hooks.server.ts` `handle()` (https://svelte.dev/docs/kit/hooks) |
| `next/link` | `<a>` (SvelteKit router intercepts links client-side) (https://svelte.dev/docs/kit/routing) |
| `useRouter` / `useParams` / `usePathname` | `goto()` from `$app/navigation`; `page.params`, `page.url` from `$app/state` (https://svelte.dev/docs/kit/$app-navigation, https://svelte.dev/docs/kit/$app-state) |
| `metadata` / `generateMetadata` / `<head>` | `<svelte:head>` in components/layouts + `app.html` placeholders (https://svelte.dev/docs/svelte/svelte-head, https://svelte.dev/docs/kit/project-structure) |
| `NEXT_PUBLIC_*` | `PUBLIC_*` (`config.kit.env.publicPrefix`, default `PUBLIC_`) (https://svelte.dev/docs/kit/environment-variables) |
| `instrumentation.ts` (`register`) | `src/instrumentation.server.js` (experimental, opt-in) or `init` hook / module init (https://svelte.dev/docs/kit/observability, https://svelte.dev/docs/kit/hooks#init) |

---

## 3. Server rendering & deployment (adapter-node, Docker)

### Adapters

- Adapters are plugins that "take the built app as input and generate output for deployment." Official adapters: `@sveltejs/adapter-cloudflare`, `@sveltejs/adapter-netlify`, `@sveltejs/adapter-node`, `@sveltejs/adapter-static`, `@sveltejs/adapter-vercel` (https://svelte.dev/docs/kit/adapters).
- **`adapter-node`** generates a standalone Node server. "You can use `adapter-node` to run a SvelteKit app within a container such as Docker or LXC" (https://svelte.dev/docs/kit/adapters). It is the direct counterpart to Next's standalone output — there is no `adapter-standalone`.
- `adapter-static` is for full SSG / SPA fallback (https://svelte.dev/docs/kit/adapter-static).

### How `vite build` works

- Building happens in two stages, both triggered by `vite build` (usually `npm run build`):
  1. Vite creates an optimized production build of server code, browser code and service worker; prerendering is executed at this stage if configured.
  2. The adapter converts the build for the target environment (https://svelte.dev/docs/kit/adapters, "Building your app" in https://svelte.dev/docs/kit/introduction).
- During the build, SvelteKit **loads `+page/layout(.server).js` files (and everything they import) for analysis**, so import-time side effects must be guarded with `building` from `$app/environment` (https://svelte.dev/docs/kit/adapters#During-the-build).
- After building, `vite preview` runs the production build locally in Node (https://svelte.dev/docs/kit/adapters#Preview-your-app).

### adapter-node specifics (Docker-relevant)

- Output directory defaults to `build`; you run it with `node build`. You need the output directory, `package.json`, and production `node_modules` (`npm ci --omit dev`); devDependencies are bundled into the app via Rollup, `dependencies` are externalized (https://svelte.dev/docs/kit/adapter-node#Deploying).
- Env vars (all documented at https://svelte.dev/docs/kit/adapter-node):
  - `HOST` (default `0.0.0.0`), `PORT` (default `3000`), `SOCKET_PATH` (overrides HOST/PORT)
  - `ORIGIN` (tells the server the canonical origin), `PROTOCOL_HEADER` (`x-forwarded-proto`), `HOST_HEADER` (`x-forwarded-host`), `PORT_HEADER` (`x-forwarded-port`) — for reverse proxies
  - `ADDRESS_HEADER`, `XFF_DEPTH` for client IP behind proxies
  - `BODY_SIZE_LIMIT` (default `512kb`, supports `K`/`M`/`G` suffixes or `Infinity`) — relevant for API endpoints
  - `SHUTDOWN_TIMEOUT` (default 30s), `IDLE_TIMEOUT` (systemd socket activation), `KEEP_ALIVE_TIMEOUT`, `HEADERS_TIMEOUT`
  - `envPrefix` option renames all of the above (e.g. `MY_CUSTOM_PORT`)
  - Options: `out` (default `'build'`), `precompress` (default `true`, gzip+brotli for assets and prerendered pages)
- Production `.env` files are **not** auto-loaded; use `dotenv` (`node -r dotenv/config build`) or `node --env-file=.env build` on Node 20.6+ (https://svelte.dev/docs/kit/adapter-node#Environment-variables).
- Graceful shutdown: on `SIGTERM`/`SIGINT` the adapter rejects new requests (`server.close`), drains idle connections (`closeIdleConnections`), then force-closes after `SHUTDOWN_TIMEOUT` (`closeAllConnections`); emits `sveltekit:shutdown` for async cleanup (https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown).
- Custom server: `build/handler.js` exports a handler usable with Express/Connect/Polka or `http.createServer` (https://svelte.dev/docs/kit/adapter-node#Custom-server). Server-lifecycle env vars only apply to `node build`; a custom server implements them itself.
- Compression: SvelteKit streams responses, so the docs recommend `@polka/compression` rather than the non-streaming `compression` package; typically compression is handled by the reverse proxy (https://svelte.dev/docs/kit/adapter-node#Compressing-responses).

### Docker guidance

- Official docs only state container suitability and the systemd/container notes (https://svelte.dev/docs/kit/adapters, https://svelte.dev/docs/kit/adapter-node#Socket-activation). There is no official Dockerfile; the community-standard pattern (which matches the repo's current two-stage Node Dockerfile) is: build stage `pnpm build` (or `npm run build`), runtime stage `node:22-slim` + `node build`. Current repo's Next Dockerfile (Dockerfile) and entrypoint (`exec node server.js` for standalone) map 1:1 to `exec node build` with `HOST=0.0.0.0` / `PORT`.

---

## 4. Middleware / hooks vs Next.js `proxy.ts`

### `hooks.server.ts` `handle()`

- `handle({ event, resolve })` runs every time the SvelteKit server receives a request (including during prerendering) and determines the response; `resolve(event, opts)` renders the route. Default is `({ event, resolve }) => resolve(event)` (https://svelte.dev/docs/kit/hooks).
- `resolve` options: `transformPageChunk({ html, done })`, `filterSerializedResponseHeaders(name, value)`, `preload({ type, path })` (https://svelte.dev/docs/kit/hooks).
- Multiple `handle` functions compose with `sequence` from `@sveltejs/kit/hooks` (https://svelte.dev/docs/kit/hooks, https://svelte.dev/docs/kit/hooks#sequence).
- `event` is a `RequestEvent` with `url`, `request` (standard `Request`), `cookies`, `locals`, `params`, `route`, `platform`, `getClientAddress()`, `fetch` (https://svelte.dev/docs/kit/hooks, https://svelte.dev/docs/kit/web-standards).
- Important caveat: **requests for static assets — including pages already prerendered — are not handled by SvelteKit**, so `handle` only sees dynamic traffic (https://svelte.dev/docs/kit/hooks).

### Mapping the repo's `proxy.ts` (Next middleware prototype)

The current `proxy.ts` uses `NextRequest`/`NextResponse`, gates `/api/*` and protected pages with a JWT cookie (`dash_session`, verified with `jose`), redirects unauthenticated page hits to `/login?from=...`, and passes static assets. In SvelteKit this becomes `src/hooks.server.ts`:

```ts
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, json } from '@sveltejs/kit';
import { jwtVerify } from 'jose';

const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/me', /* ... */]);
const PUBLIC_PAGE_PATHS = new Set(['/login']);

async function auth({ event, resolve }) {
  const { pathname } = event.url;
  const token = event.cookies.get('dash_session');
  // mirror proxy.ts logic: verify with jose, return json(401) for /api/*,
  // redirect(303, `/login?from=${pathname}`) for pages
  return resolve(event); // or return new Response('...', { status: 401 })
}

export const handle = sequence(auth, async ({ event, resolve }) => resolve(event));
```

- `redirect(status, location)` from `@sveltejs/kit` throws internally and works in `handle`, load functions, and actions (https://svelte.dev/docs/kit/hooks, https://svelte.dev/docs/kit/form-actions).
- Next middleware runs at the edge before the server; SvelteKit `handle` runs **inside the same Node server process** as the rest of the app (it is part of the SSR pipeline; see https://svelte.dev/docs/kit/hooks). There is no Next-style `matcher` config — path matching is done manually with `event.url.pathname` (docs example uses `event.url.pathname.startsWith('/custom')`, https://svelte.dev/docs/kit/hooks). For dev-server-only middleware you would use Vite's `configureServer` hook (Vite docs: https://vite.dev/guide/api-plugin#configureserver).
- Security headers currently in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CORS for `/api/*`) can be set with `setHeaders` in `handle`/load, or in `resolve`'s `transformPageChunk`/response wrapping (https://svelte.dev/docs/kit/load#setHeaders, https://svelte.dev/docs/kit/hooks).

### Other hooks

- `handleFetch` — modify/replace results of `event.fetch` in load/actions/handle; needed to forward cookies to sibling subdomains (https://svelte.dev/docs/kit/hooks#handleFetch).
- `handleError` — server/client error reporting (https://svelte.dev/docs/kit/hooks#handleError).
- `init` — added to `src/hooks.server.js` (and `hooks.client.js`); runs once when the server is created / app starts in the browser; official place "to do asynchronous work such as initializing a database connection" (https://svelte.dev/docs/kit/hooks#init).
- `reroute` — runs before `handle` on both server and client; used by i18n for localized URLs (https://svelte.dev/docs/kit/hooks#reroute).
- `transport` — custom serialization of load data (https://svelte.dev/docs/kit/hooks#transport).
- `hooks.client.js` — client hooks (e.g. `handleError`); `hooks.js` runs on both sides (https://svelte.dev/docs/kit/hooks).
- Startup/instrumentation: `src/instrumentation.server.js` is "guaranteed to be run prior to your application code being imported" **if the adapter supports it**, and is experimental — opt in via `kit.experimental.instrumentation.server` / `kit.experimental.tracing.server` in config (https://svelte.dev/docs/kit/observability). This is the closest official analog to Next `instrumentation.ts`. Alternatively, module-level init in `src/hooks.server.js` (`init` hook) or guarded module init with `building` (https://svelte.dev/docs/kit/hooks#init, https://svelte.dev/docs/kit/adapters#During-the-build).

---

## 5. Cookies, headers, redirect

- `Cookies` API on server events (`cookies` in `handle`, server `load`, actions): `get(name, opts)`, `getAll()`, `set(name, value, opts)`, `delete(name, opts)`, `serialize(name, value, opts)` (https://svelte.dev/docs/kit/load#Cookies, https://svelte.dev/docs/kit/hooks).
- Defaults: `httpOnly` and `secure` are `true` by default (except on `http://localhost`, where `secure` is `false`), `sameSite` defaults to `lax`, and `path` is **required** in `set`/`delete` options (https://svelte.dev/docs/kit/load#Cookies). This is exactly the right shape for an httpOnly JWT session cookie like the repo's `dash_session`.
- `event.request.headers` gives access to request headers (standard `Request`); `event.url` for URL (https://svelte.dev/docs/kit/web-standards, https://svelte.dev/docs/kit/hooks).
- Response headers: `setHeaders({ ... })` in server `load` (no-op in browser); a given header can only be set once; **`setHeaders` cannot set `set-cookie`** — use `cookies.set` (https://svelte.dev/docs/kit/load#setHeaders).
- `redirect(status, location)` from `@sveltejs/kit` (throws; allowed statuses 300–308; `303` for POST→GET after actions) (https://svelte.dev/docs/kit/hooks, https://svelte.dev/docs/kit/form-actions, https://svelte.dev/docs/kit/@sveltejs-kit#redirect).
- Response helpers: `json(data, init?)`, `text(body, init?)` from `@sveltejs/kit`; `error(status, body)` throws; `fail(status, data)` for action failures (https://svelte.dev/docs/kit/web-standards, https://svelte.dev/docs/kit/form-actions).
- JWT httpOnly cookie auth pattern works in SvelteKit: read/verify in `handle` (middleware) or in server `load` via `cookies.get('dash_session')`, set/refresh via `cookies.set` in actions or server load, delete via `cookies.delete` on logout (https://svelte.dev/docs/kit/load#Cookies).

---

## 6. Streaming / Suspense

- **Server-side streaming is supported**: server `load` promises are streamed to the browser as they resolve; the HTML is sent before all data is ready and the client resolves deferred values (https://svelte.dev/blog/streaming-snapshots-sveltekit, https://svelte.dev/docs/kit/load#Streaming-with-promises).
- Svelte 5 rendering primitive is `{#await promise} ... {:then value} ... {:catch error} {/await}` (https://svelte.dev/docs/svelte/await). Snippets (`{#snippet name(...)}` + `{@render name(...)}`) are the reusable-markup primitive (https://svelte.dev/docs/svelte/snippet).
- **Svelte core caveat**: "During server-side rendering, only the pending branch will be rendered" for an arbitrary promise (https://svelte.dev/docs/svelte/await). SvelteKit bridges this for **server load data**: promises are serialized via `devalue` into deferred placeholders, the SSR HTML renders the pending branch, and the browser resolves the deferreds as chunks arrive — so `{#await data.streamed.comments}` shows `Loading...` on first paint and then the `{:then}` branch client-side (https://svelte.dev/blog/streaming-snapshots-sveltekit).
- Nuances / hydration caveats:
  - Universal load promises are *not* streamed; they are recreated in the browser (https://svelte.dev/docs/kit/load#Streaming-with-promises).
  - Streaming needs JavaScript; for no-JS users only the pending branch is ever seen, so the official recommendation is to stream only non-essential data (https://svelte.dev/blog/streaming-snapshots-sveltekit).
  - `setHeaders`/`redirect` cannot be used inside streamed promises (headers/status already sent) (https://svelte.dev/docs/kit/load#Streaming-with-promises).
  - Platforms that buffer (AWS Lambda/Firebase) defeat streaming; Node servers and edge runtimes stream (https://svelte.dev/blog/streaming-snapshots-sveltekit).
  - SSR data is serialized into HTML and reused at hydration so fetch isn't repeated (https://svelte.dev/docs/kit/load#Making-fetch-requests).
- There is **no React `Suspense`-style primitive** in Svelte; `{#await}` + snippets nested in layouts/pages is the idiomatic equivalent (https://svelte.dev/docs/svelte/await, https://svelte.dev/docs/svelte/snippet).

---

## 7. i18n

- SvelteKit has **no first-party i18n solution**. The official CLI ships a **Paraglide JS** add-on: "`paraglide` — Paraglide from Inlang … compiler-based i18n library that emits tree-shakable message functions with small bundle sizes, no async waterfalls, full type-safety" (https://svelte.dev/docs/cli#sv-add, https://svelte.dev/docs/cli#Official-add-ons).
- `npx sv add paraglide` installs: Inlang project settings, the Paraglide Vite plugin, **SvelteKit `reroute` and `handle` hooks**, `text-direction` and `lang` attributes in `app.html`, and an optional demo page (https://svelte.dev/docs/cli#sv-add, https://svelte.dev/docs/cli#paraglide).
- Paraglide JS: compiler-first, type-safe `m.*` message functions, tree-shakable ESM, locale strategies, "first-class SSR"; the project describes itself as "SvelteKit's official i18n integration" (https://inlang.com/m/gerre34r/library-inlang-paraglideJs).
- SSR-safe pattern: because messages compile to functions and locale is applied via `reroute`/`handle`, there is no provider; `setLocale()` triggers navigation/reload so server renders the right locale (https://inlang.com/m/gerre34r/library-inlang-paraglideJs).
- Community alternative: `svelte-i18n` 4.0.1 (https://registry.npmjs.org/svelte-i18n; project docs at https://github.com/kaisermann/svelte-i18n) — a runtime dictionary-based i18n library, not official and not covered by Svelte docs. For a react-i18next migration, Paraglide (official add-on) is the recommended starting point.

---

## 8. Tailwind CSS v4 + shadcn-svelte

- Tailwind CSS v4 installs into any Vite project via the `@tailwindcss/vite` plugin plus `@import "tailwindcss";` in CSS (https://tailwindcss.com/docs/installation/using-vite).
- Official SvelteKit guide: `npx sv create my-project` → `npm install tailwindcss @tailwindcss/vite` → add `tailwindcss()` to `vite.config.ts` before `sveltekit()`, import `./app.css` in `+layout.svelte` (https://tailwindcss.com/docs/installation/framework-guides/sveltekit).
- `sv add tailwindcss` performs exactly this setup ("Tailwind setup following the Tailwind for SvelteKit guide", "Tailwind Vite plugin") (https://svelte.dev/docs/cli#tailwindcss). Latest versions: `tailwindcss`/`@tailwindcss/vite` 4.3.3 (https://registry.npmjs.org/@tailwindcss/vite).
- **shadcn-svelte** is the Svelte port of shadcn/ui; components are built on **bits-ui** (Svelte 5, runes-based) and Radix-style behavior; install via its CLI (`npx shadcn-svelte@latest init` / `add`) (https://www.shadcn-svelte.com/docs/installation). Latest `bits-ui` 2.18.1 (https://registry.npmjs.org/bits-ui).
- Icons: `lucide-svelte` is the official Lucide Svelte package — standalone Svelte components, tree-shakable, TypeScript-typed (https://lucide.dev/guide/packages/lucide-svelte). Latest 1.0.1 (https://registry.npmjs.org/lucide-svelte).

---

## 9. Build memory characteristics

- **No official Svelte/SvelteKit benchmark vs Next.js webpack exists** in the primary docs. What is documented:
- SvelteKit's build is `vite build` = Vite (Rollup-based) production build + prerendering + adapter step (https://svelte.dev/docs/kit/adapters#Building-your-app). During the build SvelteKit loads route modules for analysis, so import-time side effects are a build hazard and must be gated with `building` (https://svelte.dev/docs/kit/adapters#During-the-build).
- Vite's official performance guide covers large builds: audit plugins, reduce resolve operations, avoid barrel files, dynamic-import heavy deps, use `server.warmup` in dev (https://vite.dev/guide/performance). It also covers build profiling (`vite --profile`) and plugin inspection (`vite --debug plugin-transform`, `vite-plugin-inspect`) (https://vite.dev/guide/performance).
- SvelteKit's `output.bundleStrategy` (default `'split'`) controls chunking; with `'split'` you can tune `build.rollupOptions.experimentalMinChunkSize` and `build.rollupOptions.manualChunks` in the Vite config (https://svelte.dev/docs/kit/configuration#output).
- Prerender concurrency defaults to **1** — "How many pages can be prerendered simultaneously" — which bounds memory during prerendering (https://svelte.dev/docs/kit/configuration#prerender).
- adapter-node bundles `devDependencies` via Rollup and externalizes `dependencies` (https://svelte.dev/docs/kit/adapter-node#Deploying), which is how you control what gets compiled vs shipped.
- `NODE_OPTIONS=--max-old-space-size=...` is standard Node/V8 guidance (https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes), and the repo already uses it (Dockerfile sets 256 MB for install/tsc and 352 MB for `next build`, with `experimental.cpus: 1` and `staticGenerationMaxConcurrency: 1` in `next.config.ts`). For SvelteKit, the equivalent levers are: Rollup single-threaded build (Rollup is inherently single-process; Vite docs on large apps at https://vite.dev/guide/performance), `output.bundleStrategy`, `prerender.concurrency`, and keeping heavy deps external (adapter-node docs at https://svelte.dev/docs/kit/adapter-node). There is no SvelteKit equivalent of Next's `webpackMemoryOptimizations`/`webpackBuildWorker` because Vite/Rollup has no separate webpack worker model (https://vite.dev/guide/performance).
- Community knowledge (GitHub issues) about Vite build memory exists, but per task constraints only primary sources are cited here; no official "SvelteKit uses less memory than Next" claim exists.

---

## 10. Migration path: React SPA-like Next.js app → SvelteKit

| Current (this repo) | SvelteKit replacement | Primary source |
|---|---|---|
| React 19 components/pages (`app/`, `components/`) | Svelte 5 components (`+page.svelte`, `+layout.svelte`, `lib/`) with runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) | https://svelte.dev/docs/svelte/what-are-runes |
| React Query (`@tanstack/react-query`) | `@tanstack/svelte-query` (`createQuery`, `createMutation`, `QueryClientProvider`, `useHydrate`; args wrapped in functions for reactivity) | https://tanstack.com/query/latest/docs/framework/svelte/overview |
| react-i18next + i18next | Paraglide JS (`@inlang/paraglide-js`, `sv add paraglide`) or `svelte-i18n` | https://svelte.dev/docs/cli#paraglide, https://inlang.com/m/gerre34r/library-inlang-paraglideJs |
| recharts | No official Svelte chart lib from this set; ecosystem options include ECharts (`echarts` + `svelte-echarts`) and LayerChart; shadcn-svelte also has a Chart component (built on bits-ui) | https://www.shadcn-svelte.com/docs/components/chart (shadcn-svelte docs list "Chart" in Components; see https://www.shadcn-svelte.com/docs/installation) |
| lucide-react | `lucide-svelte` | https://lucide.dev/guide/packages/lucide-svelte |
| shadcn/ui + class-variance-authority + tailwind-merge | shadcn-svelte + bits-ui (uses `svelte-toolkit`/bits-ui variants; CVA/clsx still usable in Svelte) | https://www.shadcn-svelte.com/docs/installation |
| `next/link` | plain `<a>` (SvelteKit intercepts and does client-side routing) | https://svelte.dev/docs/kit/routing |
| `useRouter` / `useParams` / `usePathname` | `goto()` from `$app/navigation`; `page.params`, `page.url` from `$app/state` | https://svelte.dev/docs/kit/$app-navigation, https://svelte.dev/docs/kit/$app-state |
| Next API route handlers (`app/api/**/route.ts`) | `+server.ts` (`GET/POST/...` handlers returning `Response`; `json()` helper) | https://svelte.dev/docs/kit/routing#server |
| `metadata` / `generateMetadata` / head tags | `<svelte:head>` + `app.html` placeholders | https://svelte.dev/docs/svelte/svelte-head, https://svelte.dev/docs/kit/project-structure |
| `proxy.ts` middleware (JWT gate) | `hooks.server.ts` `handle()` (+ `sequence`, `cookies.get`, `redirect`) | https://svelte.dev/docs/kit/hooks |
| `instrumentation.ts` (`register()`) startup (bootstrap, logger, scheduler) | `src/instrumentation.server.js` (experimental opt-in) **or** `init` hook in `hooks.server.js` **or** guarded module init (`building` from `$app/environment`) | https://svelte.dev/docs/kit/observability, https://svelte.dev/docs/kit/hooks#init, https://svelte.dev/docs/kit/adapters#During-the-build |
| `NEXT_PUBLIC_*` env vars | `PUBLIC_*` (default `publicPrefix`) via `$env/static/public` / `$env/dynamic/public` | https://svelte.dev/docs/kit/environment-variables |
| `@/*` path alias | `$lib/` alias (`src/lib`) | https://svelte.dev/docs/kit/project-structure |
| Next standalone output + `node server.js` | `@sveltejs/adapter-node` + `node build` | https://svelte.dev/docs/kit/adapter-node |
| Server-side data fetching in page components | `load` functions (`+page.server.ts`/`+page.ts`), form actions for mutations | https://svelte.dev/docs/kit/load, https://svelte.dev/docs/kit/form-actions |
| `revalidateTag`/ISR | none built-in; `setHeaders` cache-control / prerender / Vercel `config.isr` | https://svelte.dev/blog/streaming-snapshots-sveltekit, https://svelte.dev/docs/kit/load#setHeaders |
| Drizzle ORM + PostgreSQL | Drizzle works as-is (Node + Postgres); `sv add drizzle` scaffolds it (`database:postgresql+client:postgres.js+docker:yes` available) | https://svelte.dev/docs/cli#drizzle |
| Scheduler / long-running process | Runs in the adapter-node process (module init guarded by `building`); `sveltekit:shutdown` for cleanup; no serverless | https://svelte.dev/docs/kit/adapters#During-the-build, https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown |

---

## 11. Gotchas

### Svelte 5 runes migration
- Svelte 5 replaces implicit reactivity with explicit runes: `$state`, `$derived`/`$derived.by`, `$effect`/`$effect.pre`, `$props`, `$bindable`, `$inspect` (https://svelte.dev/docs/svelte/what-are-runes). Official migration guide: https://svelte.dev/docs/svelte/v5-migration-guide (and `sv migrate svelte-5` for Svelte 4→5 code, per https://svelte.dev/docs/cli#sv-migrate).
- Runes only work in `.svelte` files and `.svelte.js`/`.svelte.ts` modules — **not plain `.ts` files** (https://svelte.dev/docs/svelte/svelte-js-files, https://svelte.dev/docs/svelte/what-are-runes).
- Legacy syntax (`export let`, `$:`, stores) still works in legacy mode but new code should use runes; `$app/stores` is deprecated in favor of `$app/state` (2.12+) and may be removed in SvelteKit 3 (https://svelte.dev/docs/kit/$app-state, https://svelte.dev/docs/kit/$app-stores).

### TypeScript support
- First-class TS in `.svelte` (`<script lang="ts">`), `.svelte.ts` runes modules, and `$types` generation (`PageServerLoad`, `PageProps` since 2.16) (https://svelte.dev/docs/svelte/typescript, https://svelte.dev/docs/kit/routing#$types, https://svelte.dev/docs/kit/migrating-to-sveltekit-2).
- Use `svelte-check` on the command line for CI typechecking (https://svelte.dev/docs/svelte/typescript#Using-svelte-check, https://www.npmjs.com/package/svelte-check).

### adapter-node / Node 22
- Node 22 is fine: Vite 8 requires `^20.19.0 || >=22.12.0` and `@sveltejs/vite-plugin-svelte` 7.2.0 requires `^20.19 || ^22.12 || >=24` (https://registry.npmjs.org/vite, https://registry.npmjs.org/@sveltejs/vite-plugin-svelte). The repo's `node:22-slim` base works.
- `BODY_SIZE_LIMIT` defaults to 512 kb on adapter-node — API endpoints that accept larger bodies need this env var (https://svelte.dev/docs/kit/adapter-node#BODY_SIZE_LIMIT).
- `ORIGIN` (or trusted `PROTOCOL_HEADER`/`HOST_HEADER`) is required behind a reverse proxy; otherwise form actions fail with "Cross-site POST form submissions are forbidden" (https://svelte.dev/docs/kit/adapter-node#ORIGIN-PROTOCOL_HEADER-HOST_HEADER-and-PORT_HEADER).

### WebSocket / long-running scheduler
- adapter-node core is HTTP-only; there is **no official WebSocket support**. The documented escape hatch is the custom server: import `build/handler.js` into your own `http.createServer` (https://svelte.dev/docs/kit/adapter-node#Custom-server), then attach a WebSocket server (e.g. `ws`) to that `http.Server` — this is custom code, not documented as first-party.
- A long-running scheduler (like the repo's 60s fetcher in `lib/scheduler-singleton.ts`) can run in the adapter-node process via the `init` hook or module init guarded by `building`; graceful shutdown is available via `sveltekit:shutdown` (https://svelte.dev/docs/kit/hooks#init, https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown). It will **not** run on serverless platforms; that's why adapter-node (a single long-lived Node server) is the right deployment target for this app.

### SSR-only vs client-only code
- Server-only modules: `.server.js/.ts` suffix or anything under `$lib/server`; importing them from client code is a build error ("Cannot import $lib/server/... into code that runs in the browser") (https://svelte.dev/docs/kit/server-only-modules). Note Vitest disables this check (`process.env.TEST === 'true'`) (https://svelte.dev/docs/kit/server-only-modules).
- `browser` / `building` / `dev` from `$app/environment` for runtime guards (https://svelte.dev/docs/kit/$app-environment).
- `$app/server` (`getRequestEvent`, `read`) is server-only (https://svelte.dev/docs/kit/$app-server).

### Testing
- Official Svelte docs recommend **Vitest** for unit/component tests and show `@testing-library/svelte` (`render`, `screen`, `userEvent`) with a jsdom environment (`environment: 'jsdom'` in `vitest.config.ts`) (https://svelte.dev/docs/svelte/testing, https://testing-library.com/docs/svelte-testing-library/intro/).
- `sv add vitest` sets up client/server-aware testing in the Vite config plus demo tests (https://svelte.dev/docs/cli#vitest). Runes work in tests when filenames include `.svelte`; effects need `$effect.root` + `flushSync` (https://svelte.dev/docs/svelte/testing).
- E2E: Playwright is the official recommendation and `sv add playwright` scaffolds it (https://svelte.dev/docs/svelte/testing, https://svelte.dev/docs/cli#playwright).

### React interop
- **There is no official way to embed React components in SvelteKit.** Svelte is a compiler that emits framework-native components; the primary docs contain no React-interop guide (searched svelte.dev docs; only mentions of React are comparisons such as "If you're coming from React, SvelteKit is similar to Next" — https://svelte.dev/docs/kit/introduction). Embedding React would require hand-rolled mounting (e.g. `onMount` + `createRoot`) with manual SSR/hydration bridging, which is unsupported and undocumented. **Assume a full rewrite of components/pages in Svelte.**
- Likewise there is no official React→Svelte app migration tool; `sv` only provides `sv migrate svelte-5` for existing Svelte 4→5 code (https://svelte.dev/docs/cli#sv-migrate).

### Other notable gotchas
- `use:enhance` only works for `method="POST"` forms posting to actions in `+page.server.js` (https://svelte.dev/docs/kit/form-actions).
- Pages with form actions cannot be prerendered (a server must handle the POST) (https://svelte.dev/docs/kit/page-options#When-not-to-prerender).
- Accessing `url.searchParams` during prerendering is forbidden (https://svelte.dev/docs/kit/page-options#When-not-to-prerender).
- SvelteKit does not handle requests for static assets/prerendered pages in `handle` (https://svelte.dev/docs/kit/hooks).
- `set-cookie` cannot be set via `setHeaders` (https://svelte.dev/docs/kit/load#setHeaders).
- Explicit environment variables (`experimental.explicitEnvironmentVariables`, since 2.63) are the direction of travel; `$env/*` static/dynamic modules are the current public API (https://svelte.dev/docs/kit/environment-variables).
- `$app/state` requires runes for reactivity ("Changes to `page` are available exclusively with runes") (https://svelte.dev/docs/kit/$app-state).

---

## Source index (primary)

- SvelteKit docs: https://svelte.dev/docs/kit/introduction · load · form-actions · hooks · page-options · adapters · adapter-node · adapter-static · configuration · routing · project-structure · environment-variables · server-only-modules · single-page-apps · glossary · $app-state · $app-navigation · $app-forms · $app-server · migrating-to-sveltekit-2 · observability
- Svelte docs: https://svelte.dev/docs/svelte/what-are-runes · await · snippet · typescript · testing · v5-migration-guide · svelte-head
- CLI docs: https://svelte.dev/docs/cli (sv create / sv add / official add-ons)
- Official blog: https://svelte.dev/blog/streaming-snapshots-sveltekit
- npm registry metadata: https://registry.npmjs.org/@sveltejs/kit · /svelte · /@sveltejs/adapter-node · /sv · /vite · /@sveltejs/vite-plugin-svelte · /@tanstack/svelte-query · /@inlang/paraglide-js · /svelte-i18n · /lucide-svelte · /@testing-library/svelte · /vitest · /@tailwindcss/vite · /bits-ui · /create-svelte
- Other official: https://tailwindcss.com/docs/installation/using-vite · https://tailwindcss.com/docs/installation/framework-guides/sveltekit · https://www.shadcn-svelte.com/docs/installation · https://tanstack.com/query/latest/docs/framework/svelte/overview · https://lucide.dev/guide/packages/lucide-svelte · https://vite.dev/guide/performance · https://inlang.com/m/gerre34r/library-inlang-paraglideJs · https://testing-library.com/docs/svelte-testing-library/intro/ · https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
