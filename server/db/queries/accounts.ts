// ─── Account CRUD (Drizzle) — all queries are async ─────────────────

import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../connection";
import { accounts } from "../../../db/schema";
import { encrypt, decrypt } from "../../crypto";
import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

function encToken(plain: string): string {
  try { return encrypt(plain); } catch { return plain; }
}

function decToken(cipher: string): string {
  try { return decrypt(cipher); } catch { return cipher; }
}

export interface AccountRow {
  id: number;
  owner_id: number;
  screen_name: string;
  platform: string;
  user_id: string | null;
  auth_token: string;
  fetch_interval: number;
  is_active: number;
  last_fetched_at: string | null;
  error_message: string | null;
  instance_url: string | null;
  auth_type: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountPublic = Omit<AccountRow, "auth_token">;

export async function getAccounts(ownerId?: number): Promise<AccountPublic[]> {
  const db = getDb();
  const query = db.select({
    id: accounts.id,
    owner_id: accounts.owner_id,
    screen_name: accounts.screen_name,
    platform: accounts.platform,
    user_id: accounts.user_id,
    fetch_interval: accounts.fetch_interval,
    is_active: accounts.is_active,
    last_fetched_at: accounts.last_fetched_at,
    error_message: accounts.error_message,
    instance_url: accounts.instance_url,
    auth_type: accounts.auth_type,
    created_at: accounts.created_at,
    updated_at: accounts.updated_at,
  }).from(accounts).orderBy(desc(accounts.created_at));

  if (ownerId !== undefined) {
    return query.where(eq(accounts.owner_id, ownerId));
  }
  return query;
}

export async function getActiveAccounts(): Promise<AccountRow[]> {
  const rows = await getDb().select().from(accounts).where(eq(accounts.is_active, 1));
  return rows.map(r => ({ ...r, auth_token: decToken(r.auth_token) })) as AccountRow[];
}

export async function getAccountById(id: number): Promise<AccountRow | undefined> {
  const row = await getDb().select().from(accounts).where(eq(accounts.id, id)).get();
  if (!row) return undefined;
  return { ...row, auth_token: decToken(row.auth_token) } as AccountRow;
}

export async function createAccount(
  screenName: string,
  authToken: string,
  fetchInterval: number,
  platform = "twitter",
  instanceUrl: string | null = null,
  authType: string | null = null,
  ownerId = 1,
): Promise<AccountRow> {
  const token = encToken(authToken);
  const inserted = await getDb().insert(accounts).values({
    owner_id: ownerId,
    screen_name: screenName,
    auth_token: token,
    fetch_interval: fetchInterval,
    platform,
    instance_url: instanceUrl,
    auth_type: authType,
  }).returning();
  return { ...inserted[0], auth_token: decToken(inserted[0].auth_token) } as AccountRow;
}

export async function updateAccount(id: number, updates: Partial<AccountRow>): Promise<void> {
  const safe = { ...updates };
  if (safe.auth_token) {
    safe.auth_token = encToken(safe.auth_token);
  }
  await getDb().update(accounts).set({ ...safe, updated_at: sql`datetime('now')` } as any).where(eq(accounts.id, id));
}

export function deleteAccount(id: number): void {
  const raw = new Database(dbPath());
  raw.exec("PRAGMA foreign_keys = ON");
  const deletions = [
    "DELETE FROM tweets WHERE account_id = ?",
    "DELETE FROM user_stats WHERE account_id = ?",
    "DELETE FROM github_release_assets WHERE release_id IN (SELECT id FROM github_releases WHERE account_id = ?)",
    "DELETE FROM github_releases WHERE account_id = ?",
    "DELETE FROM github_referrers WHERE account_id = ?",
    "DELETE FROM github_paths WHERE account_id = ?",
    "DELETE FROM github_traffic_clones WHERE account_id = ?",
    "DELETE FROM github_traffic_views WHERE account_id = ?",
    "DELETE FROM github_repo_snapshots WHERE account_id = ?",
    "DELETE FROM github_repos WHERE account_id = ?",
    "DELETE FROM github_contributions WHERE account_id = ?",
    "DELETE FROM github_stats WHERE account_id = ?",
    "DELETE FROM gitlab_release_assets WHERE release_id IN (SELECT id FROM gitlab_releases WHERE account_id = ?)",
    "DELETE FROM gitlab_releases WHERE account_id = ?",
    "DELETE FROM gitlab_project_snapshots WHERE account_id = ?",
    "DELETE FROM gitlab_projects WHERE account_id = ?",
    "DELETE FROM gitlab_stats WHERE account_id = ?",
    "DELETE FROM gitlab_contributions WHERE account_id = ?",
    "DELETE FROM reddit_comments WHERE account_id = ?",
    "DELETE FROM reddit_posts WHERE account_id = ?",
    "DELETE FROM reddit_stats WHERE account_id = ?",
    "DELETE FROM accounts WHERE id = ?",
  ];
  for (const sql of deletions) {
    raw.query(sql).run(id);
  }
  raw.close();
}
