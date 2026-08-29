# 兼容性保证下的全面迁移 — codex/backend-rearch 通电计划

> 目标：在不破 API/DB/线上行为的前提下，把 `domain/ports → application/usecases → infra` 真正接入生产

## 现状诊断
- 已有：`lib/domain/*`, `SyncRepoMeta/Activity/Telemetry`, `GithubClient/Mapper/Fetcher(skeleton)`, `PgRepoRepository(skeleton)`, `PgBossScheduler(skeleton)`, `fetchPolicy`, `account_fetch_state` 表已建
- 未接线：`dispatchFetch` 仍调老 `fetchGithubAccount`，`app/api/pulse` 仍调老 `getPulse`，`PgRepoRepository` 返回空，`pg-boss` 未装

## 兼容性原则（Strangler Fig）
1. 只加表/列，不删改；`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
2. 所有新路径加 `ENABLE_NEW_ARCH` 特性开关，默认走老路径，新路径 shadow 对比
3. 响应体 `PulseResponse` 用契约测试锁死，老新输出 diff=0 才切流
4. 保留老 `lib/fetchers/*` 作为 fallback，异常自动回退

## 阶段

### Phase 1 — PgRepoRepository 落地（不破查询）
- 实现 `PgRepoRepository.findAllByAccountIds / findSnapshots* / upsertRepos/upsertSnapshots` 委托给现有 `drizzle` 表 `github_repos`, `github_repo_snapshots` 等
- 契约：对同一 accountIds，新旧 Repository 查询结果 `deepEqual`
- 文件：`lib/infra/drizzle/PgRepoRepository.ts`

### Phase 2 — Fetch 接线（L0/L1/L2 真正分流）
- `SyncRepoMeta` L0 已正确只写静态字段，`SyncActivity` L1 写 stars/forks 快照 — 保持
- `dispatchFetch` 按 `level` 分发：`l0→SyncRepoMeta`, `l1→SyncActivity`, `l2→SyncTelemetry`，否则回退老 fetcher
- `scheduler` 传入 `level` 给 `dispatchFetch`（已传 `_level`，改为实参）
- 兼容：`scheduler` 仍保留 `last_fetched_at` 回退；老 fetcher 保留

### Phase 3 — Pulse 接线（双读对比）
- `app/api/pulse/route.ts` 同时调老 `getPulse` 和新 `buildPulse`（通过 `PgRepoRepository` 取数），`JSON.stringify` diff 打日志，返回老结果
- 达标后 `ENABLE_NEW_PULSE=1` 切新路径，保留 ETag 逻辑
- `mv_pulse_daily` 做成可选：存在则读视图，不存在回退直接查

### Phase 4 — 调度与依赖收尾
- `pg-boss` 设为 optional：`try import("pg-boss")`，装了且 `PG_BOSS_ENABLED=1` 才用三队列，否则保持现有 `setTimeout`
- 去 `@ts-nocheck` 增量清理

## 验证门禁
- `pnpm typecheck && pnpm lint && pnpm build:client && pnpm build:server`
- `pnpm test`（95 pass 保持）
- 新增契约测试：`pulse-contract.test.ts` 锁 `PulseResponse` 结构
