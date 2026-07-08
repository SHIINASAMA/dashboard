import { verify, hash } from "argon2";
import { getUserByUsername, updateUserPassword } from "./repositories/users";

// ── Multi-user auth ──────────────────────────────────────────────

export async function verifyCredentials(inputUsername: string, pw: string): Promise<{ ok: boolean; userId?: number; role?: string }> {
  const user = await getUserByUsername(inputUsername);
  if (!user) return { ok: false };
  try {
    const valid = await verify(user.password_hash, pw);
    if (!valid) return { ok: false };
    return { ok: true, userId: user.id, role: user.role };
  } catch {
    return { ok: false };
  }
}

export async function setUserPassword(userId: number, pw: string): Promise<void> {
  const pwHash = await hash(pw);
  await updateUserPassword(userId, pwHash);
}

// ── Legacy single-password compat ─────────────────────────────────

export async function verifyPassword(input: string): Promise<boolean> {
  const user = await getUserByUsername("admin");
  if (!user || !user.password_hash) return false;
  try {
    return verify(user.password_hash, input);
  } catch {
    return false;
  }
}

export async function setNewPassword(pw: string): Promise<void> {
  const user = await getUserByUsername("admin");
  if (user) {
    const pwHash = await hash(pw);
    await updateUserPassword(user.id, pwHash);
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserByUsername("admin");
  if (!user) return false;
  if (user.password_hash) {
    const ok = await verify(user.password_hash, oldPassword);
    if (!ok) return false;
  }
  const pwHash = await hash(newPassword);
  await updateUserPassword(user.id, pwHash);
  return true;
}
