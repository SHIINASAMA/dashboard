import bcrypt from "bcrypt";
import { getSetting, setSetting } from "./db";

const SALT_ROUNDS = 12;

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getSetting("password_hash");
  if (!hash) return true; // No password set — open access
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function setPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  setSetting("password_hash", hash);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const hash = getSetting("password_hash");
  if (hash) {
    const ok = await bcrypt.compare(oldPassword, hash);
    if (!ok) return false;
  }
  await setPassword(newPassword);
  return true;
}
