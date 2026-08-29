/**
 * Mock fetcher + Real DB — 纯新架构全链路演练（无需真实 GitHub PAT）
 *
 * 原理：MOCK_FETCHER=1 时，fetch-dispatch 走 MockGithubClient（假数据），
 * 但所有 DB 读写走真实 PostgreSQL，Pulse 查询也走真实库。
 * 可验证 L0 静态自愈 / L1 时效 / Pulse 聚合 是否符合预期。
 *
 * 用法：
 *   MOCK_FETCHER=1 pnpm exec tsx scripts/mock-with-real-db.ts
 *   # 或直接 mock 三档场景：initial -> starIncrease -> forkFix
 */

import { initPgPool, getDb } from "../lib/db/connection";
import { accounts, github_repos, github_repo_snapshots } from "../db/schema";
import { eq } from "drizzle-orm";
import { initCrypto } from "../lib/crypto";
import { loadOrGenerateKey } from "../lib/config";
import { logDir, logLevel } from "../lib/config";
import { initLogger } from "../lib/logger";
import { dispatchFetch } from "../lib/fetch-dispatch";
import { setMockScenario } from "../lib/infra/fetchers/MockGithubClient";
import { getPulse } from "../lib/services/pulse";

// 确保 mock fetcher 生效
process.env.MOCK_FETCHER = "1";

// 初始化
initCrypto(loadOrGenerateKey());
try { initLogger({ dir: logDir(), level: logLevel(), maxSize: "10m", maxFiles: 5 }); } catch {}
await initPgPool();
const db = getDb();

// 确保新架构表和列存在（真库可能是旧 schema）
const { sql } = await import("drizzle-orm");
try {
  await db.execute(sql`ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS open_issues_only INTEGER`);
  await db.execute(sql`ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS open_pull_requests INTEGER`);
  await db.execute(sql`ALTER TABLE github_repo_snapshots ADD COLUMN IF NOT EXISTS open_issues_only INTEGER`);
  await db.execute(sql`ALTER TABLE github_repo_snapshots ADD COLUMN IF NOT EXISTS open_pull_requests INTEGER`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS fetch_policy (platform TEXT NOT NULL, level TEXT NOT NULL, interval_minutes INTEGER NOT NULL, PRIMARY KEY(platform, level))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS account_fetch_state (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, level TEXT NOT NULL, last_fetched_at TEXT, next_due_at TEXT, UNIQUE(account_id, level))`);
  console.log("[mock] schema patched");
} catch (e) {
  console.log("[mock] schema patch warn:", e instanceof Error ? e.message : String(e));
}

async function ensureMockAccount() {
  const [existing] = await db.select().from(accounts).where(eq(accounts.screen_name, "mockuser")).limit(1);
  if (existing) {
    console.log(`[mock] 已存在 mockuser id=${existing.id} platform=${existing.platform}`);
    return existing;
  }
  // 创建一个 github 类型的 mock 账号（无真实 token，用 mock 抓取）
  const [row] = await db.insert(accounts).values({
    owner_id: 1,
    screen_name: "mockuser",
    platform: "github",
    user_id: "mock_github_1",
    auth_token: "", // 空 token，mock 抓取不校验
    is_active: 1,
    fetch_interval: 60,
  } as any).returning();
  console.log(`[mock] 创建 mockuser id=${row.id}`);
  return row;
}

async function showRepos(accountId: number, label: string) {
  const repos = await db.select().from(github_repos).where(eq(github_repos.account_id, accountId));
  console.log(`\n[${label}] github_repos (${repos.length}):`);
  for (const r of repos) {
    console.log(`  - ${r.full_name} id=${r.repo_id} stars=${r.stars} is_fork=${r.is_fork}`);
  }
  const snaps = await db.select().from(github_repo_snapshots).where(eq(github_repo_snapshots.account_id, accountId));
  console.log(`  snapshots (${snaps.length}):`);
  for (const s of snaps.slice(-5)) {
    console.log(`    repo ${s.repo_id} stars=${s.stars} date=${s.snapshot_date}`);
  }
}

const account = await ensureMockAccount();

console.log("\n=== 1. L0 初始抓取 (initial: 80★, fork=1) ===");
setMockScenario("initial");
await dispatchFetch(account as any, "manual", "l0");
await showRepos(account.id, "L0 initial");

console.log("\n=== 2. L1 时效抓取 (starIncrease: 80→100★) ===");
setMockScenario("starIncrease");
await dispatchFetch(account as any, "manual", "l1");
await showRepos(account.id, "L1 starIncrease");

console.log("\n=== 3. L0 自愈 fork (forkFix: is_fork 1→0) ===");
setMockScenario("forkFix");
await dispatchFetch(account as any, "manual", "l0");
await showRepos(account.id, "L0 forkFix");

console.log("\n=== 4. L2 遥测 (traffic/referrers/paths) ===");
setMockScenario("initial");
await dispatchFetch(account as any, "manual", "l2");
const clones = await db.select().from((await import("../db/schema")).github_traffic_clones).where((await import("drizzle-orm")).eq((await import("../db/schema")).github_traffic_clones.account_id, account.id));
console.log(`  clones/views 已写入: clones=${clones.length}`);
const referrers = await db.select().from((await import("../db/schema")).github_referrers).where((await import("drizzle-orm")).eq((await import("../db/schema")).github_referrers.account_id, account.id));
console.log(`  referrers 已写入: ${referrers.length}`, referrers.slice(0,2).map(r => `${r.referrer}:${r.count}`).join(", "));
const paths = await db.select().from((await import("../db/schema")).github_paths).where((await import("drizzle-orm")).eq((await import("../db/schema")).github_paths.account_id, account.id));
console.log(`  paths 已写入: ${paths.length}`, paths.slice(0,2).map(r => `${r.path}:${r.count}`).join(", "));

console.log("\n=== 5. Pulse 聚合（真实 DB） ===");
try {
  const pulse = await getPulse([{ id: account.id, screen_name: "mockuser", platform: "github" } as any], 7);
  console.log(`pulse totals: stars current=${pulse.totals.traction.stars.current} change=${pulse.totals.traction.stars.change}`);
  console.log(`repos in pulse: ${pulse.repositories.length}`);
  for (const r of pulse.repositories.slice(0, 3)) {
    console.log(`  - ${r.fullName} stars=${r.stars} starChange=${r.starChange} isFork in DB? check repos table`);
  }
} catch (e) {
  console.log("pulse 查询失败（可能无 PG 或数据不足）:", e instanceof Error ? e.message : String(e));
}

console.log("\n[done] Mock + Real DB 演练完成。可用 psql 查看 github_repos / github_repo_snapshots 验证 L0/L1 分流。");
console.log("提示：重复运行会幂等 upsert；切场景 setMockScenario 后再 dispatchFetch 即可模拟 star 波动。");
process.exit(0);
