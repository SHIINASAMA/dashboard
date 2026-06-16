import { encrypt, decrypt } from "../crypto";
import * as accountsRepo from "../repositories/accounts";
import { getLogger } from "../logger";
import type { AccountRow } from "../repositories/accounts";

function encToken(plain: string): string {
  try { return encrypt(plain); } catch (e) {
    getLogger().error("Service", "encToken: encryption failed: %s", e instanceof Error ? e.message : String(e));
    throw new Error("Encryption unavailable — cannot store credentials securely", { cause: e });
  }
}

function decToken(cipher: string): string {
  try { return decrypt(cipher); } catch (e) {
    getLogger().warn("Service", "decToken: decryption failed (ENCRYPTION_KEY may have changed): %s", e instanceof Error ? e.message : String(e));
    return cipher;
  }
}

export async function getAccounts(ownerId?: number) {
  const rows = await accountsRepo.getAccounts(ownerId);
  return rows.map(r => ({ ...r, auth_token: decToken(r.auth_token) })) as AccountRow[];
}

export async function getActiveAccounts() {
  const rows = await accountsRepo.getActiveAccounts();
  return rows.map(r => ({ ...r, auth_token: decToken(r.auth_token) })) as AccountRow[];
}

export async function getAccountById(id: number) {
  const row = await accountsRepo.getAccountById(id);
  if (!row) return undefined;
  return { ...row, auth_token: decToken(row.auth_token) } as AccountRow;
}

export async function createAccount(data: {
  screenName: string; authToken: string; fetchInterval: number;
  platform?: string; instanceUrl?: string | null; authType?: string | null;
  ownerId?: number;
}) {
  const token = encToken(data.authToken);
  const account = await accountsRepo.createAccount({
    owner_id: data.ownerId ?? 1,
    screen_name: data.screenName,
    auth_token: token,
    fetch_interval: data.fetchInterval,
    platform: data.platform ?? "twitter",
    instance_url: data.instanceUrl ?? null,
    auth_type: data.authType ?? null,
  });
  return { ...account, auth_token: decToken(account.auth_token) } as AccountRow;
}

export async function updateAccount(id: number, updates: Partial<AccountRow>) {
  const safe = { ...updates };
  if (safe.auth_token) safe.auth_token = encToken(safe.auth_token);
  await accountsRepo.updateAccount(id, safe);
}

export async function deleteAccount(id: number) {
  await accountsRepo.deleteAccount(id);
}
