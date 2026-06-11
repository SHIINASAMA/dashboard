import { eq, and, isNull, desc, sql, count } from "drizzle-orm";
import { getDb } from "../db/connection";
import { users, accounts } from "../../db/schema";

export async function getUserByUsername(username: string) {
  const rows = await getDb().select().from(users)
    .where(and(eq(users.username, username), isNull(users.deleted_at)))
    .limit(1);
  return rows[0];
}

export async function getUserById(id: number) {
  const rows = await getDb().select().from(users)
    .where(and(eq(users.id, id), isNull(users.deleted_at)))
    .limit(1);
  return rows[0];
}

export async function getUsers() {
  return getDb().select({
    id: users.id,
    username: users.username,
    role: users.role,
    created_at: users.created_at,
  }).from(users).where(isNull(users.deleted_at));
}

export async function getDeletedUserByUsername(username: string) {
  const rows = await getDb().select().from(users)
    .where(and(eq(users.username, username), sql`${users.deleted_at} IS NOT NULL`))
    .limit(1);
  return rows[0];
}

export async function insertUser(data: { username: string; password_hash: string; role: string }) {
  const inserted = await getDb().insert(users).values({
    ...data,
    created_at: sql`NOW()`,
  }).returning();
  return inserted[0];
}

export async function reviveUser(id: number, passwordHash: string, role: string) {
  await getDb().update(users)
    .set({ password_hash: passwordHash, role, deleted_at: null })
    .where(eq(users.id, id));
}

export async function updateUserPassword(id: number, passwordHash: string) {
  await getDb().update(users).set({ password_hash: passwordHash }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(accounts).set({ deleted_at: sql`NOW()` } as any).where(eq(accounts.owner_id, id));
    await tx.update(users).set({ deleted_at: sql`NOW()` } as any).where(eq(users.id, id));
  });
}

export async function hasAnyUser(): Promise<boolean> {
  const [row] = await getDb().select({ count: count() }).from(users).where(isNull(users.deleted_at));
  return row.count > 0;
}

export async function insertAdminUser(passwordHash: string) {
  return insertUser({ username: "admin", password_hash: passwordHash, role: "admin" });
}
