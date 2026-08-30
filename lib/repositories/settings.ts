// @ts-nocheck — Drizzle ORM types are complex
import { eq } from "drizzle-orm";
import { getDb } from "../db/connection";
import { settings } from "@/db/schema";
import { isMockMode } from "../config";
import * as mock from "../mock";
import { encrypt, decrypt } from "../crypto";

// The AI provider key is a secret and must not be stored in plaintext. We tag
// encrypted values so we can distinguish them from legacy plaintext rows and
// safely decrypt only what we encrypted. `encrypt` is a no-op in mock mode.
const ENCRYPTED_PREFIX = "enc:v1:";
const AI_KEY_SETTING = "ai_base_key";

function isAiKey(key: string): boolean {
  return key === AI_KEY_SETTING;
}

function encodeSecret(plain: string): string {
  return `${ENCRYPTED_PREFIX}${encrypt(plain)}`;
}

function decodeSecret(value: string): string {
  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return decrypt(value.slice(ENCRYPTED_PREFIX.length));
  }
  // Legacy plaintext value (written before encryption was enabled).
  return value;
}

export async function getSetting(key: string): Promise<string | null> {
  if (isMockMode()) {
    const value = mock.settings[key] ?? null;
    // Mock settings may already hold an encrypted marker from setSetting; keep
    // reads consistent with the DB path.
    return value === null ? null : (isAiKey(key) ? decodeSecret(value) : value);
  }
  const row = await getDb().select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  const value = row[0]?.value ?? null;
  return value === null ? null : (isAiKey(key) ? decodeSecret(value) : value);
}

export async function setSetting(key: string, value: string) {
  const stored = isAiKey(key) ? encodeSecret(value) : value;
  if (isMockMode()) {
    mock.settings[key] = stored;
    return;
  }
  await getDb().insert(settings).values({ key, value: stored }).onConflictDoUpdate({ target: settings.key, set: { value: stored } });
}
