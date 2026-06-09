import { eq, and, sql, isNull } from "drizzle-orm";
import { getDb, getClient } from "../connection";
import { users, accounts } from "../../../db/schema";
import { password } from "bun";

export type UserRow = typeof users.$inferSelect;
export type UserPublic = Pick<UserRow, "id" | "username" | "role" | "created_at">;

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  return getDb().select().from(users)
    .where(and(eq(users.username, username), isNull(users.deleted_at)))
    .get() as Promise<UserRow | undefined>;
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return getDb().select().from(users)
    .where(and(eq(users.id, id), isNull(users.deleted_at)))
    .get() as Promise<UserRow | undefined>;
}

export async function getUsers(): Promise<UserPublic[]> {
  return getDb().select({
    id: users.id,
    username: users.username,
    role: users.role,
    created_at: users.created_at,
  }).from(users).where(isNull(users.deleted_at)) as Promise<UserPublic[]>;
}

export async function createUser(username: string, pw: string, role: "admin" | "user" = "user"): Promise<UserRow> {
  const hash = await password.hash(pw, { algorithm: "argon2id" });

  // If a soft-deleted user exists, revive it instead of inserting
  const deleted = await getDb().select().from(users)
    .where(and(eq(users.username, username), sql`${users.deleted_at} IS NOT NULL`))
    .get() as UserRow | undefined;
  if (deleted) {
    await getClient().execute({
      sql: "UPDATE users SET password_hash = ?, role = ?, deleted_at = NULL WHERE id = ?",
      args: [hash, role, deleted.id],
    });
    return getUserById(deleted.id) as Promise<UserRow>;
  }

  await getClient().execute({
    sql: "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now'))",
    args: [username, hash, role],
  });
  const user = await getUserByUsername(username);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function deleteUser(id: number): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(accounts)
      .set({ deleted_at: sql`datetime('now')` })
      .where(eq(accounts.owner_id, id));
    await tx.update(users)
      .set({ deleted_at: sql`datetime('now')` })
      .where(eq(users.id, id));
  });
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const hash = await password.hash(newPassword, { algorithm: "argon2id" });
  await getDb().update(users).set({ password_hash: hash }).where(eq(users.id, id));
}
