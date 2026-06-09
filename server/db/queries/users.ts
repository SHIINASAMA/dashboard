import { eq } from "drizzle-orm";
import { getDb } from "../connection";
import { users } from "../../../db/schema";
import { password } from "bun";
import { Database } from "bun:sqlite";
import { dbPath } from "../../config";

export type UserRow = typeof users.$inferSelect;
export type UserPublic = Pick<UserRow, "id" | "username" | "role" | "created_at">;

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  return getDb().select().from(users).where(eq(users.username, username)).get() as Promise<UserRow | undefined>;
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return getDb().select().from(users).where(eq(users.id, id)).get() as Promise<UserRow | undefined>;
}

export async function getUsers(): Promise<UserPublic[]> {
  return getDb().select({
    id: users.id,
    username: users.username,
    role: users.role,
    created_at: users.created_at,
  }).from(users) as Promise<UserPublic[]>;
}

export async function createUser(username: string, pw: string, role: "admin" | "user" = "user"): Promise<UserRow> {
  const hash = await password.hash(pw, { algorithm: "argon2id" });
  const raw = new Database(dbPath());
  raw.query(
    `INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now'))`
  ).run(username, hash, role);
  const row = raw.query(
    "SELECT * FROM users WHERE username = ?"
  ).get(username) as UserRow | undefined;
  raw.close();
  return row!;
}


export function deleteUser(id: number): void {
  const raw = new Database(dbPath());
  raw.exec("PRAGMA foreign_keys = ON");

  const accountIds = raw.query("SELECT id FROM accounts WHERE owner_id = ?").all(id) as { id: number }[];
  const ids = accountIds.map(a => a.id);
  raw.exec("BEGIN");
  try {
    if (ids.length > 0) {
      const tables = [
        "tweets", "user_stats",
        "github_release_assets", "github_releases", "github_referrers",
        "github_paths", "github_traffic_clones", "github_traffic_views",
        "github_repo_snapshots", "github_repos", "github_contributions",
        "github_stats",
        "gitlab_release_assets", "gitlab_releases", "gitlab_project_snapshots",
        "gitlab_projects", "gitlab_stats", "gitlab_contributions",
        "reddit_comments", "reddit_posts", "reddit_stats",
      ];
      for (const table of tables) {
        raw.query(`DELETE FROM ${table} WHERE account_id IN (${ids.map(() => "?").join(",")})`).run(...ids);
      }
      raw.query("DELETE FROM accounts WHERE owner_id = ?").run(id);
    }

    raw.query("DELETE FROM users WHERE id = ?").run(id);
    raw.exec("COMMIT");
  } catch (e) {
    raw.exec("ROLLBACK");
    raw.close();
    throw e;
  }
  raw.close();
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const hash = await password.hash(newPassword, { algorithm: "argon2id" });
  await getDb().update(users).set({ password_hash: hash }).where(eq(users.id, id));
}
