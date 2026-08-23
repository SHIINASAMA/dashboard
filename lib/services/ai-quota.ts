import { sql, eq } from "drizzle-orm";
import { getDb } from "../db/connection";
import { isMockMode, aiConfig } from "../config";
import { ai_quota } from "@/db/schema";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayUsage(userId: number): Promise<number> {
  if (isMockMode()) return 0;
  const db = getDb();
  const rows = await db.select({
    tokens: ai_quota.tokens,
    period_date: ai_quota.period_date,
  }).from(ai_quota).where(eq(ai_quota.user_id, userId));
  const row = rows[0];
  if (!row) return 0;
  if (row.period_date === today()) return row.tokens;
  return 0;
}

/**
 * Pre-flight quota check: returns true if the user is under their daily limit.
 * Called before starting the AI stream.
 */
export async function checkQuota(userId: number): Promise<boolean> {
  if (isMockMode()) return true;
  const usage = await getTodayUsage(userId);
  const config = aiConfig();
  return usage < config.dailyTokenLimit;
}

/**
 * Record token usage after AI response completes.
 * Uses atomic SQL upsert to handle concurrent requests safely.
 */
export async function recordUsage(userId: number, tokens: number): Promise<void> {
  if (isMockMode()) return;
  if (tokens <= 0) return;
  const db = getDb();
  const todayStr = today();

  await db.execute(sql`
    INSERT INTO ai_quota (user_id, tokens, period_date)
    VALUES (${userId}, ${tokens}, ${todayStr})
    ON CONFLICT (user_id) DO UPDATE SET
      tokens = CASE
        WHEN ai_quota.period_date = ${todayStr} THEN ai_quota.tokens + ${tokens}
        ELSE ${tokens}
      END,
      period_date = CASE
        WHEN ai_quota.period_date = ${todayStr} THEN ai_quota.period_date
        ELSE ${todayStr}
      END
  `);
}
