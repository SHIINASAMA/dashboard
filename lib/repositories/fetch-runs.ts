// @ts-nocheck — Drizzle ORM types are complex
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/connection";
import { fetch_runs } from "@/db/schema";
import { isMockMode } from "../config";
import { toFetchRun, type CapabilityGap, type FetchRun, type FetchTrigger } from "../fetch-health";

export async function startFetchRun(accountId: number, trigger: FetchTrigger) {
  if (isMockMode()) return { id: Date.now(), account_id: accountId };
  const rows = await getDb().insert(fetch_runs).values({ account_id: accountId, trigger }).returning();
  return rows[0];
}

export async function finishFetchRun(input: {
  id?: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string | null;
  capabilityGaps?: CapabilityGap[];
}) {
  if (isMockMode() || input.id === undefined) return;
  await getDb().update(fetch_runs).set({
    status: input.status,
    finished_at: sql`NOW()`,
    duration_ms: sql`GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ${fetch_runs.started_at}::timestamptz)) * 1000)::int`,
    error_message: input.errorMessage ?? null,
    capability_gaps: JSON.stringify(input.capabilityGaps ?? []),
  }).where(eq(fetch_runs.id, input.id));
}

export async function getRecentRuns(accountIds: number[], limitPerAccount = 5): Promise<Map<number, FetchRun[]>> {
  const result = new Map<number, FetchRun[]>();
  if (accountIds.length === 0 || isMockMode()) return result;

  const rows = await getDb().execute(sql`
    SELECT ranked.*
    FROM (
      SELECT fr.*, ROW_NUMBER() OVER (PARTITION BY fr.account_id ORDER BY fr.started_at DESC, fr.id DESC) AS run_rank
      FROM fetch_runs fr
      WHERE fr.account_id IN ${sql.raw(`(${accountIds.join(",")})`)}
    ) ranked
    WHERE ranked.run_rank <= ${limitPerAccount}
    ORDER BY ranked.account_id, ranked.started_at DESC, ranked.id DESC
  `);

  for (const row of rows.rows as Array<Record<string, unknown>>) {
    const run = toFetchRun(row as never);
    const existing = result.get(run.account_id) ?? [];
    existing.push(run);
    result.set(run.account_id, existing);
  }
  return result;
}

export async function getFailureStreaks(accountIds: number[]): Promise<Map<number, number>> {
  if (accountIds.length === 0 || isMockMode()) return new Map();
  const rows = await getDb().select({
    account_id: fetch_runs.account_id,
    failures: sql<number>`COUNT(*)::int`,
  }).from(fetch_runs).where(and(
    inArray(fetch_runs.account_id, accountIds),
    eq(fetch_runs.status, "failed"),
    sql`NOT EXISTS (
      SELECT 1 FROM fetch_runs AS later
      WHERE later.account_id = ${fetch_runs.account_id}
        AND later.started_at > ${fetch_runs.started_at}
        AND later.status IN ('success', 'partial')
    )`,
  )).groupBy(fetch_runs.account_id);

  return new Map(rows.map((row) => [row.account_id, Number(row.failures)]));
}
