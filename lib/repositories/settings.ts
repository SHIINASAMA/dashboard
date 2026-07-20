// @ts-nocheck — Drizzle ORM types are complex
import { eq } from "drizzle-orm";
import { getDb } from "../db/connection";
import { settings } from "@/db/schema";
import { isMockMode } from "../config";
import * as mock from "../mock";

export async function getSetting(key: string): Promise<string | null> {
  if (isMockMode()) return mock.settings[key] ?? null;
  const row = await getDb().select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  return row[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  if (isMockMode()) return;
  await getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
