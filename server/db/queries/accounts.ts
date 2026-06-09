// ─── Account CRUD (Drizzle) — all queries are async ─────────────────

import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { getDb } from "../connection";
import { accounts } from "../../../db/schema";
import { encrypt, decrypt } from "../../crypto";

function encToken(plain: string): string {
  try { return encrypt(plain); } catch (e) {
    console.error("encToken: encryption failed — crypto may not be initialized", e);
    throw new Error("Encryption unavailable — cannot store credentials securely");
  }
}

// decToken decrypts if the value is encrypted, or returns as-is for
// legacy plaintext tokens stored before encryption was introduced.
// New tokens are always encrypted via encToken(); old plaintext values
// are transparently readable until the account is next updated.
function decToken(cipher: string): string {
  try { return decrypt(cipher); } catch {
    // Legacy plaintext token — not hex-encoded ciphertext
    return cipher;
  }
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
  const conditions = [isNull(accounts.deleted_at)];
  if (ownerId !== undefined) {
    conditions.push(eq(accounts.owner_id, ownerId));
  }
  return db.select({
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
  }).from(accounts)
    .where(and(...conditions))
    .orderBy(desc(accounts.created_at));
}

export async function getActiveAccounts(): Promise<AccountRow[]> {
  const rows = await getDb().select().from(accounts)
    .where(and(eq(accounts.is_active, 1), isNull(accounts.deleted_at)));
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

export async function deleteAccount(id: number): Promise<void> {
  await getDb().update(accounts)
    .set({ deleted_at: sql`datetime('now')` })
    .where(eq(accounts.id, id));
}
