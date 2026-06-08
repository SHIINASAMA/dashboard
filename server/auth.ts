import { password } from "bun";
import { loadConfig, saveConfig } from "./config";

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = loadConfig().passwordHash;
  if (!hash) return true;
  try {
    return password.verify(input, hash);
  } catch {
    return false;
  }
}

export async function setNewPassword(pw: string): Promise<void> {
  const hash = await password.hash(pw, { algorithm: "argon2id" });
  saveConfig({ passwordHash: hash });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const hash = loadConfig().passwordHash;
  if (hash) {
    const ok = await verifyPassword(oldPassword);
    if (!ok) return false;
  }
  await setNewPassword(newPassword);
  return true;
}
