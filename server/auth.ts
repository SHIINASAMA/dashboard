import { password } from "bun";
import { getUserByUsername, updateUserPassword } from "./repositories/users";

// ── Multi-user auth ──────────────────────────────────────────────

export async function verifyCredentials(inputUsername: string, pw: string): Promise<{ ok: boolean; userId?: number; role?: string }> {
  const user = await getUserByUsername(inputUsername);
  if (!user) return { ok: false };
  try {
    const valid = await password.verify(pw, user.password_hash);
    if (!valid) return { ok: false };
    return { ok: true, userId: user.id, role: user.role };
  } catch {
    return { ok: false };
  }
}

export async function setUserPassword(userId: number, pw: string): Promise<void> {
  await updateUserPassword(userId, pw);
}

// ── Legacy single-password compat ─────────────────────────────────

export async function verifyPassword(input: string): Promise<boolean> {
  const user = await getUserByUsername("admin");
  if (!user || !user.password_hash) return false;
  try {
    return password.verify(input, user.password_hash);
  } catch {
    return false;
  }
}

export async function setNewPassword(pw: string): Promise<void> {
  const user = await getUserByUsername("admin");
  if (user) {
    await updateUserPassword(user.id, pw);
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserByUsername("admin");
  if (!user) return false;
  if (user.password_hash) {
    const ok = await password.verify(oldPassword, user.password_hash);
    if (!ok) return false;
  }
  await updateUserPassword(user.id, newPassword);
  return true;
}
