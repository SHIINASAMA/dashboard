import { eq } from "drizzle-orm";
import { getDb } from "../connection";
import { settings } from "../../../db/schema";

export async function getSetting(key: string): Promise<string | null> {
  const row = await getDb().select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  return row[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
