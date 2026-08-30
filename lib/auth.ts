import { verify, hash } from "argon2";
import { getUserByUsername, getUserById, updateUserPassword } from "./repositories/users";

export interface PasswordStrength {
  valid: boolean;
  errorKey?: "TooShort" | "NeedUppercase" | "NeedLowercase" | "NeedSpecial";
}

/**
 * Server-side password policy. Must mirror the client hint (12+ chars with
 * upper, lower and a non-alphanumeric char). Never trust the client to have
 * enforced this — call this before persisting any new password.
 */
export function validatePasswordStrength(pw: string): PasswordStrength {
  if (pw.length < 12) return { valid: false, errorKey: "TooShort" };
  if (!/[A-Z]/.test(pw)) return { valid: false, errorKey: "NeedUppercase" };
  if (!/[a-z]/.test(pw)) return { valid: false, errorKey: "NeedLowercase" };
  if (!/[^a-zA-Z0-9]/.test(pw)) return { valid: false, errorKey: "NeedSpecial" };
  return { valid: true };
}

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

/**
 * Change the password for a specific user, requiring the current password.
 * A missing password_hash (unsafely seeded admin) falls back to allowing the
 * caller to set a password without an old password, which is the admin-bootstrap
 * path; after first set it always requires the current password.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;
  if (user.password_hash) {
    const ok = await verify(user.password_hash, currentPassword);
    if (!ok) return false;
  }
  const pwHash = await hash(newPassword);
  await updateUserPassword(user.id, pwHash);
  return true;
}
