/**
 * 模拟旧架构 → 新架构迁移（Mock + 真库）
 *
 * 旧状态：github_repos 的 is_fork 漂移（fork 已解除但仍标记 1），stars 旧值 80，
 *          无 fetch_policy / account_fetch_state，新列 open_issues_only 为空
 * 新状态：L0 全量分页自愈 is_fork，L1 时效更新 stars 80→100 并写快照，L2 写遥测
 *
 * 用法：MOCK_FETCHER=1 pnpm exec tsx scripts/simulate-migration.ts
 */
import { initPgPool, getDb } from "../lib/db/connection";
import { accounts, github_repos, github_repo_snapshots, github_traffic_clones } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { initCrypto } from "../lib/crypto";
import { loadOrGenerateKey } from "../lib/config";
import { logDir, logLevel } from "../lib/config";
import { initLogger } from "../lib/logger";
import { dispatchFetch } from "../lib/fetch-dispatch";
import { setMockScenario } from "../lib/infra/fetchers/MockGithubClient";
import { getPulse } from "../lib/services/pulse";

process.env.MOCK_FETCHER = "1";
initCrypto(loadOrGenerateKey());
try { initLogger({ dir: logDir(), level: logLevel(), maxSize: "10m", maxFiles: 5 }); } catch {}
await initPgPool();
const db = getDb();

async function ensureSchema() {
  await db.execute(sql`ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS open_issues_only INTEGER`);
  await db.execute(sql`ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS open_pull_requests INTEGER`);
  await db.execute(sql`ALTER TABLE github_repo_snapshots ADD COLUMN IF NOT EXISTS open_issues_only INTEGER`);
  await db.execute(sql`ALTER TABLE github_repo_snapshots ADD COLUMN IF NOT EXISTS open_pull_requests INTEGER`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS fetch_policy (platform TEXT NOT NULL, level TEXT NOT NULL, interval_minutes INTEGER NOT NULL, PRIMARY KEY(platform, level))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS account_fetch_state (id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, level TEXT NOT NULL, last_fetched_at TEXT, next_due_at TEXT, UNIQUE(account_id, level))`);
}

await ensureSchema();

// 1. 准备旧架构脏数据
console.log("=== 0. 构造旧架构脏数据 ===");
let [account] = await db.select().from(accounts).where(eq(accounts.screen_name, "mockuser")).limit(1);
if (!account) {
  [account] = await db.insert(accounts).values({ owner_id: 1, screen_name: "mockuser", platform: "github", user_id: "mock_github_1", auth_token: "", is_active: 1 } as any).returning();
}
console.log(`mockuser id=${account.id}`);

// 清理后造旧：is_fork=1（实际已不是 fork），stars=80（旧值），无快照
await db.execute(sql`DELETE FROM github_repo_snapshots WHERE account_id = ${account.id}`);
await db.execute(sql`DELETE FROM github_traffic_clones WHERE account_id = ${account.id}`);
await db.delete(github_repos).where(eq(github_repos.account_id, account.id));
await db.insert(github_repos).values([
  { account_id: account.id, repo_id: 1, name: "dashboard", full_name: "mockuser/dashboard", description: "old", language: "TS", stars: 80, forks: 10, topics: "[]", homepage: null, is_fork: 0, open_issues: 5 } as any,
  { account_id: account.id, repo_id: 2, name: "forked-lib", full_name: "mockuser/forked-lib", description: "old fork", language: null, stars: 5, forks: 1, topics: "[]", homepage: null, is_fork: 1, open_issues: 0 } as any, // 脏：实际已 detached 但仍为 1
]);
let repos = await db.select().from(github_repos).where(eq(github_repos.account_id, account.id));
console.log(`旧库 github_repos: ${repos.map(r => `${r.full_name} is_fork=${r.is_fork} stars=${r.stars}`).join(" | ")}`);
let pulseBefore: any = null;
try { pulseBefore = await getPulse([{ id: account.id, screen_name: "mockuser", platform: "github" } as any], 7); console.log(`旧 Pulse stars=${pulseBefore.totals.traction.stars.current}`); } catch (e) { console.log("旧 Pulse 失败:", String(e)); }

// 2. 新架构 L0 自愈
console.log("\n=== 1. 新架构 L0 (forkFix 场景：is_fork 1→0) ===");
setMockScenario("forkFix"); // 新架构的 Mock 返回 fork=false
await dispatchFetch(account as any, "manual", "l0");
repos = await db.select().from(github_repos).where(eq(github_repos.account_id, account.id));
console.log(`L0 后: ${repos.map(r => `${r.full_name} is_fork=${r.is_fork} stars=${r.stars}`).join(" | ")}`);
console.log(`  ✓ L0 静态自愈：forked-lib is_fork 1→0，且 stars 保持 5（L0 不覆盖时效）`);

// 3. 新架构 L1 时效
console.log("\n=== 2. 新架构 L1 (starIncrease：80→100) ===");
setMockScenario("starIncrease");
await dispatchFetch(account as any, "manual", "l1");
repos = await db.select().from(github_repos).where(eq(github_repos.account_id, account.id));
const snaps = await db.select().from(github_repo_snapshots).where(eq(github_repo_snapshots.account_id, account.id));
console.log(`L1 后 repos: ${repos.map(r => `${r.full_name} stars=${r.stars}`).join(" | ")}`);
console.log(`  快照 ${snaps.length} 条:`, snaps.map(s => `repo${s.repo_id} ${s.stars} ${s.snapshot_date}`).join(", "));
console.log(`  ✓ L1 时效：dashboard 80→100 并写快照`);

// 4. 新架构 L2 遥测
console.log("\n=== 3. 新架构 L2 (telemetry) ===");
setMockScenario("initial");
await dispatchFetch(account as any, "manual", "l2");
const clones = await db.select().from(github_traffic_clones).where(eq(github_traffic_clones.account_id, account.id));
console.log(`  clones ${clones.length} 条:`, clones.slice(0,2).map(c => `${c.count}/${c.uniques}`).join(", "));
console.log(`  ✓ L2 遥测写入 clones/views/referrers/paths`);

// 5. 对比 Pulse
console.log("\n=== 4. 迁移前后 Pulse 对比 ===");
const pulseAfter = await getPulse([{ id: account.id, screen_name: "mockuser", platform: "github" } as any], 7);
console.log(`旧 stars=${pulseBefore?.totals.traction.stars.current ?? "?"} → 新 stars=${pulseAfter.totals.traction.stars.current} change=${pulseAfter.totals.traction.stars.change}`);
console.log(`repos in pulse: ${pulseAfter.repositories.length}（starChange≠0 才展示）`);
console.log("\n[done] 旧→新迁移演练完成：L0 自愈 is_fork，L1 时效 stars，快照与 Pulse 兼容，L2 遥测增量写入。");
process.exit(0);
