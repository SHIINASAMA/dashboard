# 框架迁移评估：React Router Framework Mode vs SvelteKit

- **日期**：2026-08-06
- **范围**：在现有 Next.js 16 App Router 仪表盘基础上，评估迁移到 React Router Framework Mode（v7/v8）与 SvelteKit（Svelte 5）的可行性、成本、内存收益与风险。
- **依据**：两份一手研究文档（`docs/research/react-router-framework-mode.md`、`docs/research/sveltekit.md`，全部结论已用官方文档 URL 验证）+ 本地代码盘点（本文件仅评估，未做任何代码改动，未 commit）。
- **历史背景**：本仓库 2026-07-08 刚从 **Hono + Vite SPA** 迁到 Next.js App Router（见 `docs/superpowers/plans/2026-07-08-nextjs-migration.md`）。因此"迁移到 RR/SvelteKit"在 RR 场景下实质是**迁回 Vite 系**，需要重新审视当初离开 Vite 的理由。

---

## 0. 结论摘要（TL;DR）

| 选项 | 结论 | 一句话理由 |
|---|---|---|
| 留在 Next.js 16 | ❌ 已不可行 | 构建已 OOMKilled，压到 ~900MB 仍不稳，无更优机器可用，不能放弃自动化 |
| React Router Framework Mode | ✅ 唯一可行路线 | 真实仓库 spike 已完整跑通：拆 client/SSR 双进程构建后峰值 **client ~500MB / SSR ~230MB**（见 §10），组件层几乎全部保留 |
| SvelteKit | ❌ 不建议 | 内存实测 525MB–1.2GB 超配额，且需全量重写（React→Svelte），成本 2–5 倍 |

**所有选项都无法达成"构建峰值 200MB 以内"**：Node.js 进程基线约 164MB RSS（此前已实测），加上 `pnpm install`、`tsc --noEmit`、框架构建，任何自托管全栈框架（Next / RR / SvelteKit）的容器构建峰值都不可能低于 200MB。迁移的目标应重新定义为"**比当前 ~900MB 峰值显著更低、稳定落在 CI 容器配额内**"，而不是 200MB。

**迁移决策已收敛（见 §10 实测）**：React Router v7 + Vite 7/Rollup 为唯一可行路线，采用 **client / SSR 两个独立进程分阶段构建**（各进程峰值均 ≤ ~500MB）；产品定位同步更新为**纯数据平台**（去掉"社交媒体"定位描述）。

---

## 1. 评估背景：现状盘点与内存优化历史

### 1.1 代码规模（本地核实）

- **前端**：100 个 ts/tsx（`app/` + `components/` + `lib/client`），约 6.1k LOC；16 个 dashboard 页面 + login
- **API**：**46 个 route handler**（`app/api/**/route.ts`，38 GET / 7 POST / 3 PUT / 2 DELETE），全部基于 `next/server` `NextRequest/NextResponse` + `next/headers` `cookies()` + `@/lib/auth-helpers`
- **框架实际用途**：文件路由 + SSR 外壳（页面以客户端组件为主，数据全部走 React Query）+ 46 个 JSON 接口 + `proxy.ts` 中间件（jose JWT）+ `instrumentation.ts` 启动钩子 + standalone Docker
- **导航 API**：`next/navigation` 14 文件（`useRouter`×11、`useParams`×6、`usePathname`×3、`redirect`×1）、`next/link` 4 文件
- **`next/image`：0 使用**（全原生 `<img>`）；**`next/font`：0**；**无 loading/error/not-found/template**；metadata 仅根 layout 静态导出
- **前端技术栈**：@tanstack/react-query（`app/providers.tsx` 带 `useSyncExternalStore` 水合守卫）、react-i18next、ThemeProvider、recharts、lucide-react、shadcn/ui 风格组件、Tailwind CSS v4、Vitest + @testing-library（3 个组件测试）
- **后端/共享**：`lib/`（services/repositories/fetchers）、`db/`（Drizzle + pg）、`shared/`；调度器 `lib/scheduler-singleton.ts`（globalThis 守卫，每 60s 拉取）

### 1.2 Docker / CI

- Dockerfile：`node:22-slim` 两阶段；`NODE_OPTIONS` 256MB（install/tsc）→ 352MB（webpack build）；`--child-concurrency=1 --network-concurrency=4`；独立 `tsc -p tsconfig.build.json --noEmit` + `SKIP_NEXT_TYPECHECK=1` + `pnpm build`（即 `next build --webpack`）；产物 `.next/standalone` + `docker-entrypoint.sh`
- `.gitlab-ci.yml`：kaniko 构建镜像 + kubectl set image；**未配置显式 resources limits**（OOMKilled 来自 kaniko 构建容器/节点的内存上限）
- `next.config.ts` 已压到：`experimental.cpus: 1`、`staticGenerationMaxConcurrency: 1`、`staticGenerationMinPagesPerWorker: 29`、`webpackBuildWorker: false`、`webpackMemoryOptimizations: true`、`workerThreads: true`、`output: "standalone"`、`serverExternalPackages` 8 项
- 上一轮已把构建峰值从 OOM 压到 **~900MB RSS**（核心手段：所有页面 `force-dynamic` 关掉静态生成、单 CPU、关 worker、堆上限 352MB、串行化原生编译）

### 1.3 内存约束结论（必须清醒）

- 200MB 内做 Next / RR / SvelteKit 任何一家的生产构建，物理上不可能（Node 基线 ~164MB）
- 当前 900MB 与 CI 容器配额的关系未知（CI 未配置 resources limits，OOM 来自节点总内存压力）。**在动手迁移前，应先确认 CI 容器实际配额**（`kubectl describe node` / 询问运维），避免迁移后仍撞同一堵墙
- 迁移到 Vite 系（RR/SvelteKit）**可能**把峰值降到 400–700MB（Vite/Rollup 通常比 webpack+RSC 管线轻），但**没有任何官方基准数据**，必须实测

---

## 2. React Router Framework Mode 评估

### 2.1 版本现实（2026-08-06 核实）

- npm `latest` = **v8.3.0**（2026-07-22，Node ≥22.22，React ≥19.2.7，ESM-only，middleware 常开，`react-router-dom` 移除，`@react-router/serve` 用 Express 5.2.1）
- **v7.18.2** 仍在维护（2026-07-28，Node ≥20，React ≥18）——v7 是"经典 Framework Mode"（原 Remix 路线），官方文档按版本发布
- 本仓库 Node 22 / React 19.2.7 / Vite 兼容性：**v7 与 v8 都满足**；新项目建议直接上 v8（v7 是上一代）

### 2.2 迁移映射（哪些改、哪些不改）

**几乎全部保留（≈95% 前端代码）：**

- 所有 React 页面/组件（16 页面 + 组件库）、react-query providers、i18n、ThemeProvider、shadcn 组件、recharts、lucide-react、Tailwind v4（仅把 `@tailwindcss/postcss` 换成 `@tailwindcss/vite`）
- `lib/`、`db/`、`shared/` 全部业务逻辑（框架无关）
- 原生 `<img>`（无 next/image 迁移）

**结构性改动（机械但面广）：**

| 现状 | RR Framework Mode | 工作量 |
|---|---|---|
| `app/` 文件路由 | `app/routes.ts` + `root.tsx`，`route()/index()/layout()/prefix()` | 中（一次性） |
| 16 个页面 | route 模块（组件体基本原样） | 低 |
| 46 个 route handler | **resource routes**（`loader`=GET、`action`=其他；无默认组件） | 低-中（机械） |
| `NextRequest/NextResponse` | 标准 Web `Request/Response` | 低（机械） |
| `cookies()`（`next/headers`） | `request.headers.get("Cookie")` + `createCookie/createCookieSessionStorage` 或 middleware 上下文 | 低 |
| `proxy.ts`（edge middleware） | route 模块 `export const middleware`（root 或 dashboard/api 分支）；**无 matcher 配置，路径手动匹配**；运行于 Node 进程而非 edge（自托管无影响） | 低（jose 逻辑原样） |
| `instrumentation.ts` 启动钩子 | **无直接等价**：需自定义 server（`@react-router/express` + `createRequestHandler`）或 `entry.server.tsx` 启动逻辑；scheduler-singleton 守卫保留 | 中（本项目核心功能，必须处理） |
| `next/navigation`（14 文件） | `useNavigate/useLocation/useParams/Link` 等 | 低 |
| metadata（根 layout） | root route `meta`/`Links` | 低 |
| Docker standalone | **无 standalone 等价**：`react-router build` → `build/client` + `build/server/index.js`，镜像需复制 `build/` + **生产 node_modules**（比 standalone 大，但更简单）；或自定义 Express server | 中 |
| tsconfig | 需 `rootDirs` + `.react-router/types`（typegen）；`react-router build` 不 typecheck，需 `typegen && tsc` | 低 |
| env | `VITE_*` 前缀（替换 `NEXT_PUBLIC_*`） | 低 |

### 2.3 与 Next 16 的能力差异（对本项目的影响）

| 能力 | Next 16 现状 | RR | 影响 |
|---|---|---|---|
| ISR / `revalidateTag` | **未使用**（全部 `force-dynamic` + React Query） | 无内置等价（`clientLoader` 缓存 / HTTP Cache-Control / `prerender`） | **无影响** |
| Server Components (RSC) | 未实质使用（客户端组件为主） | 无稳定等价（RSC 实验性） | **无影响** |
| 流式渲染 | 未使用 | `defer`/`<Await>` 支持 | 无影响 |
| 边缘中间件 | `proxy.ts`（edge） | Node 进程内 middleware | 自托管无影响；行为需回归测试（尤其 `from` 重定向与 401 JSON） |
| 开发体验 | webpack HMR | Vite HMR + **HDR**（热数据再验证） | 更优 |
| 官方迁移指南 | — | **无官方 Next→RR 指南**（仅 modes 文档提及） | 增加不确定性，靠 Remix 社区经验 |

### 2.4 构建内存（无官方数据，需实测）

- **没有任何官方 Vite-vs-Next 构建内存对比**（RR 仓库搜索无结果）
- RR 构建链路 = `react-router typegen`（Node v22.12 曾有 CPU/内存回归 issue，已关闭）+ `vite build`（client + server 两个 Rollup bundle）+ 独立 `tsc` + `pnpm install`
- 已知可调旋钮：`minify: 'oxc'`、`maxParallelFileOps`、`reportCompressedSize`、`NODE_OPTIONS=--max-old-space-size`；server 构建是**单文件大 bundle**，Rollup 阶段峰值需要实测
- 乐观估计 400–700MB RSS；**200MB 仍不可能**

### 2.5 风险与成本评估

- **成本**：结构性迁移为主，前端组件零重写。估计 **5–10 个工作日**（含 Docker/CI、回归测试）
- **风险**：中等。集中在（a）scheduler 启动（自定义 server）、（b）proxy 语义回归、（c）46 个接口的 JSON 格式一致性、（d）v8 生态较新（发布约 1 个月）
- **长期收益**：脱离 webpack 内存怪癖与 RSC 管线；构建更快（Vite）；HDR 开发体验；自托管部署模型更透明
- **历史讽刺**：本项目 2026-07-08 刚从 Vite SPA 迁到 Next（当时动机是统一前后端/SSR/standalone）；RR 能提供同样的"统一 + SSR + 自托管"，但等于绕了一圈回到 Vite 系——**除非内存实测有显著收益，否则不值得再动一次**

---

## 3. SvelteKit 评估

### 3.1 版本现实（2026-08-06 核实）

- `@sveltejs/kit` **2.70.2** stable（2026-07-29，Node ≥18.13；SvelteKit 3 仍 `3.0.0-next.14` **未稳定**）
- `svelte` **5.56.8**（Svelte 5 runes）、`@sveltejs/adapter-node` **5.5.7**、Vite **8.2.0**（Node 20.19+/22.12+，本仓库 Node 22 兼容）
- **没有 `adapter-standalone`**（npm 404）；Docker 等价物是 `adapter-node`（`node build`，HOST/PORT，优雅退出）
- **没有官方 React→Svelte 迁移工具**（`sv migrate` 只覆盖 Svelte 4→5）；**没有官方 React 互操作**（在 SvelteKit 中嵌 React 需要手写 mount/SSR 桥接，不受支持）→ **必须全量重写**

### 3.2 迁移映射

**机械部分（可保留思路）：**

| 现状 | SvelteKit | 工作量 |
|---|---|---|
| 46 个 route handler | `+server.ts`（标准 Request/Response，`json()/text()`） | 低-中（机械） |
| `proxy.ts` | `hooks.server.ts` `handle()` + `sequence`（`event.cookies.get('dash_session')`、`redirect()/json()`；注意静态资源/预渲染页不进 handle） | 低 |
| `instrumentation.ts` | `init` hook 或实验性 `src/instrumentation.server.js`（需 adapter 支持） | 中 |
| `app/layout.tsx` | `+layout.svelte` + `app.html` | 中 |
| 安全头/CORS | `setHeaders`（注意：`set-cookie` 必须走 `cookies` API） | 低 |
| Tailwind v4 | `@tailwindcss/vite`（官方支持 SvelteKit） | 低 |

**全量重写部分（成本主体）：**

| 现状 | SvelteKit 等价 | 说明 |
|---|---|---|
| 16 页面 + 全部组件（~6.1k LOC React） | Svelte 5 runes + snippets | **全部重写**；无互操作、无自动迁移 |
| recharts 图表 | ECharts / LayerChart / shadcn-svelte Chart | 图表是交互核心，重写+调优成本高 |
| @tanstack/react-query | @tanstack/svelte-query | 数据层 API 重写 |
| react-i18next | Paraglide（官方 add-on，编译期类型安全） | 字典/翻译键可复用，调用点全改 |
| lucide-react | lucide-svelte | 低（图标名基本一致） |
| shadcn/ui | shadcn-svelte（bits-ui） | 组件 API 不同，逐个重写 |
| Vitest + @testing-library/react | Vitest + @testing-library/svelte | 3 个测试重写 + 新增覆盖 |
| `next/link` / `NEXT_PUBLIC_*` / `@/*` | `<a>` / `PUBLIC_*` / `$lib/` | 低（机械） |

### 3.3 构建内存与部署

- **同样无官方 SvelteKit-vs-Next 基准**；Vite/Rollup 管线通常较轻，可调 `output.bundleStrategy`（默认 `'split'`）、`prerender.concurrency`（默认 1）、`NODE_OPTIONS`——但这些 Next 侧也有等价物
- adapter-node 产物为 `build/`（server + client），与 RR 一样**需要携带生产 node_modules**（或外部化 dependencies），Docker 体积比 standalone 大
- 200MB 目标同样不可能；与 RR 相比**没有明显内存优势**（两者同一代 Vite 8）

### 3.4 风险与成本评估

- **成本**：全量重写。估计 **3–6 周**（单人、含图表/测试/回归），是 RR 路径的 2–5 倍
- **风险**：高。核心交互（recharts 图表、抽屉/表格、水合守卫）在 Svelte 5 下全部重做；SvelteKit 3 即将发布，现在投入 2.x 意味着短期内还要再迁一次
- **收益**：与 RR 重叠（Vite 构建、轻量运行时），额外收益仅是 Svelte 本身的包体积/运行时效率——对本项目（自托管、数据全走 API、构建内存瓶颈）**不构成决定性优势**

---

## 4. 对比总表

| 维度 | 留在 Next 16 | React Router v7/v8 | SvelteKit 2 |
|---|---|---|---|
| 前端代码复用 | 100% | ≈95%（组件零重写） | ≈0%（全量重写） |
| 46 个 API 路由 | 不变 | 机械迁移（resource routes） | 机械迁移（+server.ts） |
| 中间件（proxy.ts） | 不变 | route middleware（Node 进程） | hooks.server.ts |
| 启动/调度器 | instrumentation 不变 | 自定义 server / entry.server 钩子 | init hook / instrumentation（实验） |
| Docker 形态 | standalone（最小） | `build/` + prod node_modules | adapter-node `build/` + deps |
| 构建内存 | **实测 ~900MB**（基线） | 未知，预期更低（**需 spike**） | 未知，预期相近于 RR（**需 spike**） |
| 200MB 目标 | 不可能 | 不可能 | 不可能 |
| ISR/revalidateTag | 未用 | 无等价（无影响） | 无等价（无影响） |
| 官方迁移指南 | — | 无（Remix 社区经验） | 无 React→Svelte 工具 |
| 生态成熟度 | 最成熟 | 成熟（Remix 血统；v8 较新） | 较成熟（SvelteKit 3 将至） |
| 迁移成本 | 0 | 5–10 个工作日 | 3–6 周 |
| 回归风险 | 0 | 中低 | 高 |
| 唯一强理由 | — | 内存（未证实）+ 摆脱 webpack | 内存（未证实）+ Svelte 运行时效率（与本项目无关） |

---

## 5. 建议

1. **不迁移 SvelteKit**。成本/风险不成比例，内存收益未证实，且现在处于 SvelteKit 大版本交接期。
2. **React Router 仅在"实测内存显著下降"时才值得**。它保留全部 React 投资，是三者中唯一合理的迁移候选；但决策依据必须是 spike 数据，而不是"Vite 应该更省内存"的直觉。
3. **先做零成本实验**（§6），大概率可以留在 Next 并继续压内存。
4. 若最终决定迁移 RR：建议直接上 **v8**（与仓库 React 19.2.7/Node 22 兼容、middleware 已是默认），按 §2.2 的映射表拆成小步提交，优先保证 46 个 API + proxy + scheduler 语义不变。

---

## 6. 建议的验证路径（按成本递增）

1. **确认 CI 真实配额**：`kubectl describe node` / 找运维确认 kaniko 构建容器内存上限——先弄清墙在哪，再决定要不要翻墙。
2. **`next build --turbopack` 对照实验**（0.5–1 天，不动架构）：
   - 当前 `package.json` 脚本为 `next build --webpack`（显式 webpack；`next --help` 确认 16.2.10 支持 `--turbopack`）
   - 在同一 Dockerfile 约束下跑 `next build --turbopack`，对比峰值 RSS 与产物行为（standalone 是否一致）
   - Turbopack 是 Rust 实现，内存画像与 webpack 完全不同；这是**留在 Next 内换构建器**的最低成本选项
3. **React Router spike 原型**（2–3 天，独立临时目录或 worktree，不动主分支）：
   - 用仓库真实页面子集 + 相同依赖，跑 `react-router build`（v8），在 `NODE_OPTIONS=--max-old-space-size=352` 与 `cpus=1` 同款限制下量峰值 RSS
   - 顺带验证 scheduler（自定义 server）与 proxy 语义的可行性
4. **SvelteKit spike**（可选，1–2 天）：仅构建内存对照（`sv create` + adapter-node + `vite build`），不必做页面——用于把"RR vs SvelteKit 内存"从猜测变成数据。
5. 拿到三组峰值（webpack 900MB / turbopack ? / RR ? / SK ?）后再做最终决策。

---

## 7. 参考

- `docs/research/react-router-framework-mode.md`（RR v7/v8 版本、API 映射、Docker、内存、gotchas；全部 URL 已验证）
- `docs/research/sveltekit.md`（SvelteKit 版本、load/+server/hooks/streaming/adapter-node/i18n/Tailwind v4/内存/重写映射；全部 URL 已验证）
- `docs/superpowers/plans/2026-07-08-nextjs-migration.md`（本项目当初 Hono+Vite → Next 的动机与约束）
- 本地代码盘点：`package.json`、`next.config.ts`、`proxy.ts`、`instrumentation.ts`、`Dockerfile`、`.gitlab-ci.yml`、`app/`（16 pages + 46 route handlers）

---

## 8. 构建内存实测（2026-08-06，双轨 spike 数据）

**方法**：同一台机器（macOS Apple Silicon）、Node v22.23.1、pnpm 11.10.0、`NODE_OPTIONS=--max-old-space-size=352`（与仓库 Dockerfile 相同）、`/usr/bin/time -l` 测量整棵进程树峰值 RSS。两个 spike 均为与仓库同重量级的原型（RR：19 路由模块；SK：28 源文件，9 页面 + 8 API 端点 + hooks）。

| 轨 | 图表依赖 | 峰值 RSS | 构建耗时 | 客户端 JS |
|---|---|---|---|---|
| **React Router v8.3.0** | recharts | **570 MB** | 1.8s | — |
| **React Router v8.3.0** | echarts 整包 | **701 MB** | 2.3s | 1.22 MB |
| **React Router v8.3.0** | echarts tree-shaken | **686 MB** | ~2s | 0.66 MB |
| **SvelteKit 2.70.2** | echarts 整包 | **1,168 MB** | 6.2s | 1.22 MB |
| **SvelteKit 2.70.2** | echarts tree-shaken | **1,130–1,199 MB** | 5.5–5.9s | 0.66 MB |

**结论（重要）**：

1. **RR v8 原型构建峰值 ~570–700 MB，显著低于 Next 的 ~900 MB 真实基线，且构建极快（~2s，Vite 8 使用 Rust 原生 Rolldown）** —— CI 内存压力可大幅缓解。
2. **SvelteKit 原型构建峰值 ~1.13–1.20 GB，反而高于 Next 基线**。tree-shaking echarts 只降产物体积（−46%），几乎不影响 RSS（−3% 内）。内存由 Vite 8/Rolldown 原生分配 + Svelte 编译器主导，与 bundle 大小无关。
3. 若 CI 容器限制 ≈1 GB（Next 900MB OOM 的推断），**SvelteKit 真实应用构建大概率同样 OOM**，与"迁移到 SvelteKit 解决 CI"的目标冲突。
4. 两者都是原型规模（RR 19 模块 / SK 28 文件），真实应用（6.1k LOC + 46 API 路由）只会更高；但相对排序稳健（同规模下 SK ≈ RR × 1.7）。

**对 A/K 双版本方案的影响**：
- **A 轨（React Router）**：内存友好，适合立即上，先救 CI。
- **K 轨（SvelteKit）**：长期方向可保留，但必须先回答 CI 真实配额（若 >1.2GB 则可行，否则需要：拆 client/server 构建、换更轻图表、或接受不可行），并在真实规模迁移后复测。

---

## 9. Vite 7 / Rollup 4 对照实测（2026-08-06 追加）

用户随后确认：**CI 构建容器内存不止 500 MB，但不要抱高期望**。因此在 §8（Vite 8/Rolldown）之外，补测了 **Vite 7.3.6 + Rollup 4（纯 JS bundler，内存受 V8 堆控制）** 路线，验证"降并发、时间换空间"能否把构建压进 500 MB。

**方法**：同一 spike 源码降级版本（RR：react-router 7.18.2 + @react-router/dev 7.18.2 + @react-router/node + vite 7.3.6；SK：@sveltejs/kit 2.70.2 + @sveltejs/vite-plugin-svelte 6.2.4 + vite 7.3.6），`/usr/bin/time -l` 测整树峰值 RSS，`NODE_OPTIONS=--max-old-space-size=N` 控制堆，`build.rollupOptions.maxParallelFileOps=1` 串行化模块处理。

### RR v7 + Vite 7（Rollup 4）

| 配置 | 结果 | 峰值 RSS | client 耗时 |
|---|---|---|---|
| 352 MB 堆 + 默认并行（含 echarts） | OOM（heap） | 517 MB | — |
| 352 MB 堆 + 串行（含 echarts） | OOM（heap） | 507 MB | — |
| 352 MB 堆 + 串行（去 echarts，对齐真实项目） | ✅ | **504 MB** | 2.16s |
| 320 MB 堆 + 串行 | ✅ | 477 MB | 2.27s |
| **300 MB 堆 + 串行** | ✅ | **445–458 MB** | 2.27s |
| 300 MB 堆 + 默认并行 | ✅ | 472 MB | 2.37s |
| 290 MB 堆 + 串行 | OOM（heap） | 437 MB | — |

### RR v8 + Vite 8 同工作量对照（去 echarts 重测）

| 配置 | 结果 | 峰值 RSS |
|---|---|---|
| RR 8.3.0 + Vite 8.2.0（Rolldown），352 MB 堆 | ✅ | **567 MB** |

→ 同工作量下 **RR v7 + Rollup 比 RR v8 + Rolldown 省约 100–120 MB RSS**（Rollup 是 JS，堆可压；Rolldown 是 Rust 原生分配，堆帽无效）。

### SK + Vite 7（Rollup 4）

| 配置 | 结果 | 峰值 RSS |
|---|---|---|
| 352 MB 堆 + 默认并行（含 echarts tree-shaken） | OOM（SSR 阶段） | 525 MB |
| 352 MB 堆 + 默认并行（去 echarts） | OOM（SSR 阶段） | 526 MB |
| 352 MB 堆 + 串行（去 echarts） | OOM（client 阶段） | **652 MB** |
| 320 / 300 / 280 MB 堆 | OOM | 465–491 MB |

→ **SvelteKit + Rollup 4 连"最小原型 + 零图表依赖"都超过 352 MB 堆**（Svelte 5 编译器 + kit 运行时 + Rollup JS 模块图），RSS 下限 ≥ 525 MB。SK 在 Vite 8/Rolldown（1.13–1.20 GB）与 Vite 7/Rollup（≥525 MB）两条路线都超出当前 CI 可接受范围。

### 更新结论

1. **唯一能进 500 MB 的路线是：RR v7.18.2 + Vite 7（Rollup 4）+ `maxParallelFileOps=1` + `--max-old-space-size=300`**：spike 峰值 445–472 MB，留约 30–55 MB 余量。
2. RR v7 的堆下限 ≈ 295–300 MB（290 即 OOM）；**串行化是必要的**（默认并行在 300 MB 堆时 RSS 高 ~27 MB，且更接近上限）。
3. echarts 即使 tree-shaken 也会把 RR7 的堆需求从 ≤300 MB 推到 >352 MB（OOM）——**真实迁移不要引入 echarts；继续用 recharts**（recharts 未导致超限）。
4. SvelteKit 在当前 CI 内存下**不可行**（两条 bundler 路线均超出），长期选项需等机器升级或拆 client/server 构建。
5. 真实应用（6.1k LOC + 更多组件）client 构建会比 spike 重，预计堆需求 320–360 MB、RSS 480–520 MB；若 CI 实际配额明显高于 500 MB（用户确认"不止 500 MB"），RR v7 路线仍是最优选择，但必须**在真实迁移后于 CI 同款限制下复测**。

---

## 10. 真实仓库 spike 实测（2026-08-06 晚追加，全量 16 页 + 46 API + recharts）

在 `/tmp/rr-real-spike-20260806`（真实仓库副本，非 git）完成 **全部** 迁移（16 页面 + 46 API route + 中间件 + Node server 冒烟），用 `/usr/bin/time -l` 测整树峰值 RSS。与 §9 的简化 spike 不同，这里是真实代码规模（client 2617 modules / SSR 141 modules）。

### 单进程基线（RR CLI 原生流程）

| 配置 | 结果 | 峰值 RSS | 说明 |
|---|---|---|---|
| `react-router build` @ 300MB 堆 | OOM | ~479MB | client ✓ 后 SSR 阶段崩 |
| `react-router build` @ 352MB 堆 | OOM | ~569MB | SSR transform 阶段崩 |
| `react-router build` @ 400MB 堆 + `--max-semi-space-size=8` | ✅ | **586MB** | 能跑通但超 500MB |

→ client（2617 modules）与 SSR（141 modules）两个 Rollup 环境在**同一 V8 堆**连续构建、堆不回收，峰值叠加是超限根因。

### 双进程分阶段（推荐方案）

对 RR CLI（`@react-router/dev` 7.18.2 的 `viteBuild`）打了约 12 行补丁：支持 `RR_SKIP_SSR=1`（只 build client）与 `RR_SKIP_CLIENT=1`（跳过 clean + client，只 build SSR 且 `emptyOutDir:false`）。正式迁移用 `pnpm patch` 持久化。

| 阶段 | 命令 | 堆 | 峰值 RSS | 模块 | 耗时 |
|---|---|---|---|---|---|
| 1. client | `RR_SKIP_SSR=1 react-router build` | 320MB + semi 8 | **497–504MB** | 2617 | ~2.7–2.9s |
| 2. SSR | `RR_SKIP_CLIENT=1 react-router build` | 160–200MB + semi 8 | **227–229MB** | 141 | ~0.55s |

- client 堆下限 ≈ **315–320MB**（315 OOM，320 通过）；`--minify=false`、Rollup `cache:false`、V8 `--optimize-for-size` 均无法突破，瓶颈是 2617 模块的 AST/模块图本身
- 全量验证：`tsc --noEmit` ✅；`eslint` ✅（修复 66 个 codemod 残留 no-unused-vars）；运行时冒烟 ✅（`/api/health` 200、`/login` 200 SSR HTML、未登录 `/overview` 302→`/login`、`/api/*` 401）
- 服务端入口：`server/index.mjs` 用 `@react-router/node` 的 `createRequestListener({ build })`

### 更新结论

1. **RR v7 + Vite 7/Rollup 在真实应用规模下可以稳定压到每进程 ≤ ~500MB**，前提是 client/SSR **分阶段独立进程**构建（`RR_SKIP_SSR` / `RR_SKIP_CLIENT` 补丁）。
2. client 阶段 497–504MB 的余量很薄：若 CI 配额是 0.5GiB（512MB），建议配额至少 **768MB–1GiB**；若必须 <500MB 且有富余时间，后续可继续降 client 模块图（如替换 recharts 为轻量图表）或拆更细。
3. 产品定位已同步改为**纯数据平台**（README / AGENTS / CLAUDE / locales 去掉 "social media" 定位）。
