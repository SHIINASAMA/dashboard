# Framework Migration Evaluation: React Router Framework Mode vs SvelteKit

- **Date**: 2026-08-06
- **Scope**: Evaluating the feasibility, cost, memory benefits, and risks of migrating from the existing Next.js 16 App Router dashboard to React Router Framework Mode (v7/v8) and SvelteKit (Svelte 5).
- **Basis**: Two primary research documents (`.agents/research/react-router-framework-mode.md`, `.agents/research/sveltekit.md`, all conclusions verified with official documentation URLs) + local code inventory (this file is evaluation only; no code changes were made, no commits).
- **Historical context**: This repository was migrated from **Hono + Vite SPA** to Next.js App Router on 2026-07-08 (see `.agents/plans/2026-07-08-nextjs-migration.md`). Therefore, "migrating to RR/SvelteKit" in the RR scenario essentially means **migrating back to the Vite family**, requiring a reassessment of why Vite was left in the first place.

---

## 0. Executive Summary (TL;DR)

| Option | Verdict | One-sentence rationale |
|---|---|---|
| Stay on Next.js 16 | ❌ No longer viable | Build already OOMKilled; even throttled to ~900MB is unstable; no better machine available; cannot give up automation |
| React Router Framework Mode | ✅ Only viable path | Real repository spike fully completed: after splitting client/SSR into dual-process builds, peak memory is **client ~500MB / SSR ~230MB** (see §10); nearly all components retained |
| SvelteKit | ❌ Not recommended | Measured memory 525MB–1.2GB exceeds quota, and requires full rewrite (React→Svelte) at 2–5× the cost |

**All options fail to achieve "build peak under 200MB"**: Node.js process baseline is approximately 164MB RSS (previously measured), and with `pnpm install`, `tsc --noEmit`, and framework builds, any self-hosted full-stack framework (Next / RR / SvelteKit) build peak cannot realistically fall below 200MB. The migration goal should be redefined as "**significantly lower than the current ~900MB peak, stably within the CI container quota**", not 200MB.

**Migration decision has converged (see §10 measurements)**: React Router v7 + Vite 7/Rollup is the only viable path, using **client / SSR two independent processes with staged builds** (each process peak ≤ ~500MB); product positioning updated to **pure data platform** (removing "social media" positioning language).

---

## 1. Evaluation Context: Current State Inventory & Memory Optimization History

### 1.1 Code Scale (Local Verification)

- **Frontend**: 100 ts/tsx files (`app/` + `components/` + `lib/client`), approximately 6.1k LOC; 16 dashboard pages + login
- **API**: **46 route handlers** (`app/api/**/route.ts`, 38 GET / 7 POST / 3 PUT / 2 DELETE), all based on `next/server` `NextRequest/NextResponse` + `next/headers` `cookies()` + `@/lib/auth-helpers`
- **Framework actual usage**: File routing + SSR shell (pages are primarily client-side components, all data via React Query) + 46 JSON endpoints + `proxy.ts` middleware (jose JWT) + `instrumentation.ts` startup hook + standalone Docker
- **Navigation API**: `next/navigation` 14 files (`useRouter`×11, `useParams`×6, `usePathname`×3, `redirect`×1), `next/link` 4 files
- **`next/image`**: 0 usage (all native `<img>`); **`next/font`**: 0; **No loading/error/not-found/template**; metadata only in root layout static export
- **Frontend tech stack**: @tanstack/react-query (`app/providers.tsx` with `useSyncExternalStore` hydration guard), react-i18next, ThemeProvider, recharts, lucide-react, shadcn/ui-style components, Tailwind CSS v4, Vitest + @testing-library (3 component tests)
- **Backend/shared**: `lib/` (services/repositories/fetchers), `db/` (Drizzle + pg), `shared/`; scheduler `lib/scheduler-singleton.ts` (globalThis guard, fetches every 60s)

### 1.2 Docker / CI

- Dockerfile: `node:22-slim` two-stage; `NODE_OPTIONS` 256MB (install/tsc) → 352MB (webpack build); `--child-concurrency=1 --network-concurrency=4`; standalone `tsc -p tsconfig.build.json --noEmit` + `SKIP_NEXT_TYPECHECK=1` + `pnpm build` (i.e., `next build --webpack`); artifacts `.next/standalone` + `docker-entrypoint.sh`
- `.gitlab-ci.yml`: kaniko image build + kubectl set image; **no explicit resources limits configured** (OOMKilled comes from kaniko build container/node memory cap)
- `next.config.ts` already throttled: `experimental.cpus: 1`, `staticGenerationMaxConcurrency: 1`, `staticGenerationMinPagesPerWorker: 29`, `webpackBuildWorker: false`, `webpackMemoryOptimizations: true`, `workerThreads: true`, `output: "standalone"`, `serverExternalPackages` 8 items
- Previous round already throttled build peak from OOM down to **~900MB RSS** (core approach: `force-dynamic` on all pages to disable static generation, single CPU, workers off, heap cap 352MB, serialized native compilation)

### 1.3 Memory Constraint Conclusions (Must Be Clear-Headed)

- 200MB is physically impossible for production builds of Next / RR / SvelteKit or any other framework (Node baseline ~164MB)
- The relationship between the current 900MB and CI container quota is unknown (CI has no resources limits configured; OOM comes from aggregate node memory pressure). **Before starting the migration, verify the actual CI container quota** (`kubectl describe node` / ask ops) to avoid hitting the same wall after migrating
- Migrating to the Vite family (RR/SvelteKit) **may** reduce the peak to 400–700MB (Vite/Rollup is typically lighter than webpack+RSC pipelines), but **there is no official benchmark data** — must be measured empirically

---

## 2. React Router Framework Mode Evaluation

### 2.1 Version Reality (Verified 2026-08-06)

- npm `latest` = **v8.3.0** (2026-07-22, Node ≥22.22, React ≥19.2.7, ESM-only, middleware always-on, `react-router-dom` removed, `@react-router/serve` uses Express 5.2.1)
- **v7.18.2** still maintained (2026-07-28, Node ≥20, React ≥18) — v7 is the "classic Framework Mode" (original Remix approach), official docs organized by version
- This repository's Node 22 / React 19.2.7 / Vite compatibility: **both v7 and v8 satisfy requirements**; new projects should go directly to v8 (v7 is previous generation)

### 2.2 Migration Mapping (What Changes, What Doesn't)

**Nearly all retained (≈95% frontend code):**

- All React pages/components (16 pages + component library), react-query providers, i18n, ThemeProvider, shadcn components, recharts, lucide-react, Tailwind v4 (only replace `@tailwindcss/postcss` with `@tailwindcss/vite`)
- `lib/`, `db/`, `shared/` — all business logic (framework-agnostic)
- Native `<img>` (no next/image migration)

**Structural changes (mechanical but broad):**

| Current | RR Framework Mode | Effort |
|---|---|---|
| `app/` file routing | `app/routes.ts` + `root.tsx`, `route()/index()/layout()/prefix()` | Medium (one-time) |
| 16 pages | Route modules (component body largely unchanged) | Low |
| 46 route handlers | **Resource routes** (`loader`=GET, `action`=other; no default component) | Low-Medium (mechanical) |
| `NextRequest/NextResponse` | Standard Web `Request/Response` | Low (mechanical) |
| `cookies()` (`next/headers`) | `request.headers.get("Cookie")` + `createCookie/createCookieSessionStorage` or middleware context | Low |
| `proxy.ts` (edge middleware) | Route module `export const middleware` (root or dashboard/api branch); **no matcher config, manual path matching**; runs in Node process instead of edge (no impact for self-hosted) | Low (jose logic unchanged) |
| `instrumentation.ts` startup hook | **No direct equivalent**: requires custom server (`@react-router/express` + `createRequestHandler`) or `entry.server.tsx` startup logic; scheduler-singleton guard retained | Medium (core project functionality, must be handled) |
| `next/navigation` (14 files) | `useNavigate/useLocation/useParams/Link` etc. | Low |
| Metadata (root layout) | Root route `meta`/`Links` | Low |
| Docker standalone | **No standalone equivalent**: `react-router build` → `build/client` + `build/server/index.js`, image needs `build/` + **production node_modules** (larger than standalone but simpler); or custom Express server | Medium |
| tsconfig | Needs `rootDirs` + `.react-router/types` (typegen); `react-router build` does not typecheck, needs `typegen && tsc` | Low |
| env | `VITE_*` prefix (replaces `NEXT_PUBLIC_*`) | Low |

### 2.3 Feature Differences vs Next 16 (Impact on This Project)

| Feature | Next 16 Current | RR | Impact |
|---|---|---|---|
| ISR / `revalidateTag` | **Not used** (all `force-dynamic` + React Query) | No built-in equivalent (`clientLoader` caching / HTTP Cache-Control / `prerender`) | **No impact** |
| Server Components (RSC) | Not substantively used (primarily client components) | No stable equivalent (RSC experimental) | **No impact** |
| Streaming rendering | Not used | `defer`/`<Await>` supported | No impact |
| Edge middleware | `proxy.ts` (edge) | Middleware in Node process | No impact for self-hosted; behavior needs regression testing (especially `from` redirects and 401 JSON) |
| Developer experience | webpack HMR | Vite HMR + **HDR** (hot data revalidation) | Better |
| Official migration guide | — | **No official Next→RR guide** (only mentioned in modes docs) | Increases uncertainty; relies on Remix community experience |

### 2.4 Build Memory (No Official Data; Must Be Measured)

- **There are no official Vite-vs-Next build memory comparisons** (RR repo search returns nothing)
- RR build chain = `react-router typegen` (Node v22.12 had a CPU/memory regression issue, now closed) + `vite build` (client + server two Rollup bundles) + standalone `tsc` + `pnpm install`
- Known tunable knobs: `minify: 'oxc'`, `maxParallelFileOps`, `reportCompressedSize`, `NODE_OPTIONS=--max-old-space-size`; server build is a **single large bundle** — Rollup phase peak needs measurement
- Optimistic estimate 400–700MB RSS; **200MB still impossible**

### 2.5 Risk and Cost Assessment

- **Cost**: Primarily structural migration; zero frontend component rewriting. Estimated **5–10 business days** (including Docker/CI, regression testing)
- **Risk**: Moderate. Concentrated in (a) scheduler startup (custom server), (b) proxy semantic regression, (c) JSON format consistency across 46 endpoints, (d) v8 ecosystem is relatively new (~1 month since release)
- **Long-term benefits**: Escape webpack memory quirks and RSC pipeline; faster builds (Vite); HDR developer experience; more transparent self-hosted deployment model
- **Historical irony**: This project migrated from Vite SPA to Next on 2026-07-08 (motivation was unifying frontend/backend/SSR/standalone); RR provides the same "unified + SSR + self-hosted" but effectively means circling back to Vite — **unless memory measurements show significant gains, another migration is not worth it**

---

## 3. SvelteKit Evaluation

### 3.1 Version Reality (Verified 2026-08-06)

- `@sveltejs/kit` **2.70.2** stable (2026-07-29, Node ≥18.13; SvelteKit 3 still at `3.0.0-next.14`, **not stable**)
- `svelte` **5.56.8** (Svelte 5 runes), `@sveltejs/adapter-node` **5.5.7**, Vite **8.2.0** (Node 20.19+/22.12+, this repository's Node 22 is compatible)
- **No `adapter-standalone`** (npm 404); Docker equivalent is `adapter-node` (`node build`, HOST/PORT, graceful shutdown)
- **No official React→Svelte migration tool** (`sv migrate` only covers Svelte 4→5); **no official React interop** (embedding React in SvelteKit requires manual mount/SSR bridging, unsupported) → **full rewrite required**

### 3.2 Migration Mapping

**Mechanical parts (approach reusable):**

| Current | SvelteKit | Effort |
|---|---|---|
| 46 route handlers | `+server.ts` (standard Request/Response, `json()/text()`) | Low-Medium (mechanical) |
| `proxy.ts` | `hooks.server.ts` `handle()` + `sequence` (`event.cookies.get('dash_session')`, `redirect()/json()`; note static assets/pre-rendered pages don't go through handle) | Low |
| `instrumentation.ts` | `init` hook or experimental `src/instrumentation.server.js` (requires adapter support) | Medium |
| `app/layout.tsx` | `+layout.svelte` + `app.html` | Medium |
| Security headers/CORS | `setHeaders` (note: `set-cookie` must use `cookies` API) | Low |
| Tailwind v4 | `@tailwindcss/vite` (official SvelteKit support) | Low |

**Full rewrite parts (major cost):**

| Current | SvelteKit Equivalent | Notes |
|---|---|---|
| 16 pages + all components (~6.1k LOC React) | Svelte 5 runes + snippets | **Full rewrite**; no interop, no auto-migration |
| recharts charts | ECharts / LayerChart / shadcn-svelte Chart | Charts are interaction core; rewrite + tuning cost is high |
| @tanstack/react-query | @tanstack/svelte-query | Data layer API rewrite |
| react-i18next | Paraglide (official add-on, compile-time type safety) | Dictionary/translation keys reusable, call sites all change |
| lucide-react | lucide-svelte | Low (icon names largely identical) |
| shadcn/ui | shadcn-svelte (bits-ui) | Different component APIs, rewrite individually |
| Vitest + @testing-library/react | Vitest + @testing-library/svelte | 3 tests rewrite + new coverage |
| `next/link` / `NEXT_PUBLIC_*` / `@/*` | `<a>` / `PUBLIC_*` / `$lib/` | Low (mechanical) |

### 3.3 Build Memory and Deployment

- **Also no official SvelteKit-vs-Next benchmarks**; Vite/Rollup pipelines are typically lighter; tunable `output.bundleStrategy` (default `'split'`), `prerender.concurrency` (default 1), `NODE_OPTIONS` — but Next has equivalents for these as well
- adapter-node output is `build/` (server + client), same as RR — **requires production node_modules** (or externalized dependencies); Docker image larger than standalone
- 200MB target equally impossible; **no clear memory advantage over RR** (both same generation Vite 8)

### 3.4 Risk and Cost Assessment

- **Cost**: Full rewrite. Estimated **3–6 weeks** (single developer, including charts/tests/regression), 2–5× the RR path
- **Risk**: High. Core interactions (recharts charts, drawers/tables, hydration guards) all redone under Svelte 5; SvelteKit 3 is imminent, so investing in 2.x means another migration in the near future
- **Benefits**: Overlap with RR (Vite build, lightweight runtime); additional benefit is only Svelte's own bundle size/runtime efficiency — **not a decisive advantage** for this project (self-hosted, all data via API, build memory bottleneck)

---

## 4. Comparison Matrix

| Dimension | Stay on Next 16 | React Router v7/v8 | SvelteKit 2 |
|---|---|---|---|
| Frontend code reuse | 100% | ≈95% (zero component rewrites) | ≈0% (full rewrite) |
| 46 API routes | Unchanged | Mechanical migration (resource routes) | Mechanical migration (+server.ts) |
| Middleware (proxy.ts) | Unchanged | Route middleware (Node process) | hooks.server.ts |
| Startup/Scheduler | instrumentation unchanged | Custom server / entry.server hooks | init hook / instrumentation (experimental) |
| Docker form | standalone (minimal) | `build/` + prod node_modules | adapter-node `build/` + deps |
| Build memory | **Measured ~900MB** (baseline) | Unknown, expected lower (**needs spike**) | Unknown, expected similar to RR (**needs spike**) |
| 200MB target | Impossible | Impossible | Impossible |
| ISR/revalidateTag | Not used | No equivalent (no impact) | No equivalent (no impact) |
| Official migration guide | — | None (Remix community experience) | No React→Svelte tool |
| Ecosystem maturity | Most mature | Mature (Remix lineage; v8 relatively new) | Fairly mature (SvelteKit 3 imminent) |
| Migration cost | 0 | 5–10 business days | 3–6 weeks |
| Regression risk | 0 | Medium-Low | High |
| Only strong argument | — | Memory (unverified) + escape webpack | Memory (unverified) + Svelte runtime efficiency (irrelevant to this project) |

---

## 5. Recommendations

1. **Do not migrate to SvelteKit**. Cost/risk disproportionate, memory benefit unverified, and currently in the middle of a SvelteKit major version transition.
2. **React Router is only worth it if measurements show significant memory reduction**. It preserves all React investment and is the only reasonable migration candidate among the three; but the decision must be based on spike data, not intuition that "Vite should use less memory."
3. **Start with zero-cost experiments** (§6); most likely you can stay on Next and continue reducing memory.
4. If the final decision is to migrate to RR: recommend going directly to **v8** (compatible with the repo's React 19.2.7/Node 22, middleware is default), follow the mapping table in §2.2 to break into small commits, prioritizing identical semantics for the 46 APIs + proxy + scheduler.

---

## 6. Proposed Verification Path (Increasing Cost Order)

1. **Confirm actual CI quota**: `kubectl describe node` / ask ops to confirm kaniko build container memory cap — first figure out where the wall is, then decide whether to climb it.
2. **`next build --turbopack` control experiment** (0.5–1 day, no architecture changes):
   - Current `package.json` script is `next build --webpack` (explicit webpack; `next --help` confirms 16.2.10 supports `--turbopack`)
   - Run `next build --turbopack` under the same Dockerfile constraints, compare peak RSS and output behavior (whether standalone is consistent)
   - Turbopack is a Rust implementation with a completely different memory profile from webpack; this is the **lowest-cost option to switch builders while staying on Next**
3. **React Router spike prototype** (2–3 days, in a separate temp directory or worktree, not on main):
   - Use a real page subset from the repo + same dependencies, run `react-router build` (v8), measure peak RSS under `NODE_OPTIONS=--max-old-space-size=352` and `cpus=1` constraints
   - Also verify scheduler (custom server) and proxy semantic feasibility
4. **SvelteKit spike** (optional, 1–2 days): Build memory comparison only (`sv create` + adapter-node + `vite build`), no need to build pages — to turn "RR vs SvelteKit memory" from guesswork into data.
5. After obtaining three peak measurements (webpack 900MB / turbopack ? / RR ? / SK ?), make the final decision.

---

## 7. References

- `.agents/research/react-router-framework-mode.md` (RR v7/v8 versions, API mapping, Docker, memory, gotchas; all URLs verified)
- `.agents/research/sveltekit.md` (SvelteKit versions, load/+server/hooks/streaming/adapter-node/i18n/Tailwind v4/memory/rewrite mapping; all URLs verified)
- `.agents/plans/2026-07-08-nextjs-migration.md` (original motivation and constraints for Hono+Vite → Next migration)
- Local code inventory: `package.json`, `next.config.ts`, `proxy.ts`, `instrumentation.ts`, `Dockerfile`, `.gitlab-ci.yml`, `app/` (16 pages + 46 route handlers)

---

## 8. Build Memory Measurements (2026-08-06, Dual-Track Spike Data)

**Method**: Same machine (macOS Apple Silicon), Node v22.23.1, pnpm 11.10.0, `NODE_OPTIONS=--max-old-space-size=352` (same as repo Dockerfile), `/usr/bin/time -l` to measure peak RSS across the entire process tree. Both spikes are prototypes at the same weight as the repo (RR: 19 route modules; SK: 28 source files, 9 pages + 8 API endpoints + hooks).

| Track | Chart Dependency | Peak RSS | Build Time | Client JS |
|---|---|---|---|---|
| **React Router v8.3.0** | recharts | **570 MB** | 1.8s | — |
| **React Router v8.3.0** | echarts full bundle | **701 MB** | 2.3s | 1.22 MB |
| **React Router v8.3.0** | echarts tree-shaken | **686 MB** | ~2s | 0.66 MB |
| **SvelteKit 2.70.2** | echarts full bundle | **1,168 MB** | 6.2s | 1.22 MB |
| **SvelteKit 2.70.2** | echarts tree-shaken | **1,130–1,199 MB** | 5.5–5.9s | 0.66 MB |

**Conclusions (Important)**:

1. **RR v8 prototype build peak ~570–700 MB, significantly lower than Next's ~900 MB real baseline, and builds extremely fast (~2s, Vite 8 uses Rust-native Rolldown)** — CI memory pressure can be greatly reduced.
2. **SvelteKit prototype build peak ~1.13–1.20 GB, actually higher than the Next baseline**. Tree-shaking echarts only reduces output size (−46%), barely affecting RSS (within −3%). Memory is dominated by Vite 8/Rolldown native allocation + Svelte compiler, independent of bundle size.
3. If the CI container limit ≈1 GB (inferred from Next 900MB OOM), **SvelteKit real application builds would very likely also OOM**, contradicting the goal of "migrating to SvelteKit to solve CI."
4. Both are prototype-scale (RR 19 modules / SK 28 files); real application (6.1k LOC + 46 API routes) will only be higher; but the relative ordering is robust (at the same scale, SK ≈ RR × 1.7).

**Impact on A/K dual-track strategy**:
- **Track A (React Router)**: Memory-friendly, suitable for immediate adoption to rescue CI.
- **Track K (SvelteKit)**: Long-term direction can be retained, but must first answer the CI real quota question (if >1.2GB then viable, otherwise requires: split client/server builds, switch to lighter charts, or accept infeasibility), and re-test after real-scale migration.

---

## 9. Vite 7 / Rollup 4 Control Measurements (2026-08-06 Addendum)

The user subsequently confirmed: **CI build container memory exceeds 500 MB, but don't get your hopes up**. Therefore, in addition to §8 (Vite 8/Rolldown), a supplementary test was run on the **Vite 7.3.6 + Rollup 4 (pure JS bundler, memory controlled by V8 heap)** path to verify whether "lower concurrency, trading time for space" could squeeze builds under 500 MB.

**Method**: Downgraded versions of the same spike source code (RR: react-router 7.18.2 + @react-router/dev 7.18.2 + @react-router/node + vite 7.3.6; SK: @sveltejs/kit 2.70.2 + @sveltejs/vite-plugin-svelte 6.2.4 + vite 7.3.6), `/usr/bin/time -l` to measure peak RSS across the tree, `NODE_OPTIONS=--max-old-space-size=N` to control heap, `build.rollupOptions.maxParallelFileOps=1` to serialize module processing.

### RR v7 + Vite 7 (Rollup 4)

| Configuration | Result | Peak RSS | Client Time |
|---|---|---|---|
| 352 MB heap + default parallelism (with echarts) | OOM (heap) | 517 MB | — |
| 352 MB heap + serialized (with echarts) | OOM (heap) | 507 MB | — |
| 352 MB heap + serialized (without echarts, aligned with real project) | ✅ | **504 MB** | 2.16s |
| 320 MB heap + serialized | ✅ | 477 MB | 2.27s |
| **300 MB heap + serialized** | ✅ | **445–458 MB** | 2.27s |
| 300 MB heap + default parallelism | ✅ | 472 MB | 2.37s |
| 290 MB heap + serialized | OOM (heap) | 437 MB | — |

### RR v8 + Vite 8 Same-Workload Control (without echarts, re-measured)

| Configuration | Result | Peak RSS |
|---|---|---|
| RR 8.3.0 + Vite 8.2.0 (Rolldown), 352 MB heap | ✅ | **567 MB** |

→ At the same workload, **RR v7 + Rollup saves approximately 100–120 MB RSS compared to RR v8 + Rolldown** (Rollup is JS, heap can be throttled; Rolldown is Rust-native allocation, heap cap is ineffective).

### SK + Vite 7 (Rollup 4)

| Configuration | Result | Peak RSS |
|---|---|---|
| 352 MB heap + default parallelism (with echarts tree-shaken) | OOM (SSR phase) | 525 MB |
| 352 MB heap + default parallelism (without echarts) | OOM (SSR phase) | 526 MB |
| 352 MB heap + serialized (without echarts) | OOM (client phase) | **652 MB** |
| 320 / 300 / 280 MB heap | OOM | 465–491 MB |

→ **SvelteKit + Rollup 4 exceeds the 352 MB heap even with "minimal prototype + zero chart dependencies"** (Svelte 5 compiler + kit runtime + Rollup JS module graph); RSS floor ≥ 525 MB. SK exceeds the currently acceptable CI range on both Vite 8/Rolldown (1.13–1.20 GB) and Vite 7/Rollup (≥525 MB) paths.

### Updated Conclusions

1. **The only path that fits within 500 MB is: RR v7.18.2 + Vite 7 (Rollup 4) + `maxParallelFileOps=1` + `--max-old-space-size=300`**: spike peak 445–472 MB, leaving approximately 30–55 MB headroom.
2. RR v7 heap floor is ≈295–300 MB (290 causes OOM); **serialization is mandatory** (default parallelism at 300 MB heap adds ~27 MB RSS and runs closer to the limit).
3. echarts, even tree-shaken, pushes RR7's heap requirement from ≤300 MB to >352 MB (OOM) — **do not introduce echarts in a real migration; continue using recharts** (recharts did not cause overages).
4. SvelteKit is **infeasible** under current CI memory (both bundler paths exceed limits); long-term options require machine upgrades or split client/server builds.
5. Real application (6.1k LOC + more components) client build will be heavier than the spike; estimated heap requirement 320–360 MB, RSS 480–520 MB; if the actual CI quota is significantly higher than 500 MB (user confirmed "exceeds 500 MB"), the RR v7 path remains optimal, but must be **re-tested under actual CI constraints after real migration**.

---

## 10. Real Repository Spike Measurements (2026-08-06 Evening Addendum, Full 16 Pages + 46 APIs + recharts)

Completed **full** migration (16 pages + 46 API routes + middleware + Node server smoke test) at `/tmp/rr-real-spike-20260806` (real repository copy, not git), measured peak RSS across the entire process tree with `/usr/bin/time -l`. Unlike the simplified spike in §9, this uses real code scale (client 2617 modules / SSR 141 modules).

### Single-Process Baseline (RR CLI Native Flow)

| Configuration | Result | Peak RSS | Notes |
|---|---|---|---|
| `react-router build` @ 300MB heap | OOM | ~479MB | Client ✓ then SSR phase crashes |
| `react-router build` @ 352MB heap | OOM | ~569MB | SSR transform phase crashes |
| `react-router build` @ 400MB heap + `--max-semi-space-size=8` | ✅ | **586MB** | Runs but exceeds 500MB |

→ Client (2617 modules) and SSR (141 modules) two Rollup environments build sequentially within **the same V8 heap** without heap reclamation; peak overlap is the root cause of overages.

### Dual-Process Staged Build (Recommended Approach)

Applied approximately 12 lines of patches to the RR CLI (`@react-router/dev` 7.18.2's `viteBuild`): added support for `RR_SKIP_SSR=1` (build client only) and `RR_SKIP_CLIENT=1` (skip clean + client, build SSR only with `emptyOutDir:false`). Formal migration should persist this via `pnpm patch`.

| Phase | Command | Heap | Peak RSS | Modules | Time |
|---|---|---|---|---|---|
| 1. Client | `RR_SKIP_SSR=1 react-router build` | 320MB + semi 8 | **497–504MB** | 2617 | ~2.7–2.9s |
| 2. SSR | `RR_SKIP_CLIENT=1 react-router build` | 160–200MB + semi 8 | **227–229MB** | 141 | ~0.55s |

- Client heap floor is ≈ **315–320MB** (315 OOM, 320 passes); `--minify=false`, Rollup `cache:false`, V8 `--optimize-for-size` cannot break through; bottleneck is the AST/module graph of 2617 modules itself
- Full validation: `tsc --noEmit` ✅; `eslint` ✅ (fixed 66 codemod-residual no-unused-vars); runtime smoke test ✅ (`/api/health` 200, `/login` 200 SSR HTML, unauthenticated `/overview` 302→`/login`, `/api/*` 401)
- Server entry: `server/index.mjs` uses `@react-router/node`'s `createRequestListener({ build })`

### Updated Conclusions

1. **RR v7 + Vite 7/Rollup can stably hold each process at ≤ ~500MB at real application scale**, provided client/SSR are built in **staged independent processes** (using the `RR_SKIP_SSR` / `RR_SKIP_CLIENT` patch).
2. Client phase headroom at 497–504MB is very thin: if CI quota is 0.5GiB (512MB), recommend quota of at least **768MB–1GiB**; if <500MB is mandatory and time permits, further reduce the client module graph (e.g., replace recharts with a lighter charting library) or split more finely.
3. Product positioning has been updated to **pure data platform** (README / AGENTS / CLAUDE / locales remove "social media" positioning).
