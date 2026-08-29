// @ts-nocheck — lightweight wrapper, types are loose
/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";
import { getDb, getPgPool } from "../db/connection";
import { accountFetchState } from "@/db/schema";
import { isMockMode } from "../config";

export async function getAccountFetchState(accountId: number) {
  if (isMockMode()) return [];
  try {
    const db = getDb();
    const rows = await db.select().from(accountFetchState).where(eq(accountFetchState.accountId, accountId));
    return rows.map((r: any) => ({ level: r.level, lastFetchedAt: r.lastFetchedAt }));
  } catch {
    try {
      const pool = getPgPool();
      if (!pool) return [];
      const { rows } = await pool.query("SELECT level, last_fetched_at FROM account_fetch_state WHERE account_id = $1", [accountId]);
      return rows.map((r: any) => ({ level: r.level, lastFetchedAt: r.last_fetched_at }));
    } catch { return []; }
  }
}

export async function upsertAccountFetchState(accountId: number, level: string, iso: string) {
  if (isMockMode()) return;
  try {
    const db = getDb();
    await db.insert(accountFetchState).values({ accountId, level, lastFetchedAt: iso, nextDueAt: iso }).onConflictDoUpdate({
      target: [accountFetchState.accountId, accountFetchState.level],
      set: { lastFetchedAt: iso, nextDueAt: iso },
    });
  } catch {
    try {
      const pool = getPgPool();
      if (!pool) return;
      await pool.query(
        "INSERT INTO account_fetch_state (account_id, level, last_fetched_at) VALUES ($1,$2,$3) ON CONFLICT (account_id, level) DO UPDATE SET last_fetched_at = EXCLUDED.last_fetched_at",
        [accountId, level, iso]
      );
    } catch { /* table may not exist before migration */ }
  }
}
