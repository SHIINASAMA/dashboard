import { password } from "bun";
import { getSetting, setSetting } from "./db";

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = getSetting("password_hash");
  if (!hash) return true; // No password set — open access
  try {
    return password.verify(input, hash);
  } catch {
    return false;
  }
}

export async function setNewPassword(pw: string): Promise<void> {
  const hash = await password.hash(pw, { algorithm: "argon2id" });
  setSetting("password_hash", hash);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const hash = getSetting("password_hash");
  if (hash) {
    const ok = await verifyPassword(oldPassword);
    if (!ok) return false;
  }
  await setNewPassword(newPassword);
  return true;
}
