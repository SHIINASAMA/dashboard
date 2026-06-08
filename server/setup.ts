import { initCrypto } from "./crypto";
import { getSetting, setSetting } from "./db";
import { loadOrGenerateKey, loadOrGeneratePassword } from "./bootstrap";

export async function bootstrap() {
  // 1. Load/generate encryption key
  const key = loadOrGenerateKey();
  initCrypto(key);

  // 2. Check password state
  await loadOrGeneratePassword(getSetting, setSetting);

  const hasPassword = !!getSetting("password_hash");
  if (!hasPassword) {
    console.log("⚠  No login password set. Anyone can log in.");
    console.log("   Use /settings in the dashboard to set a password.");
  }
}
