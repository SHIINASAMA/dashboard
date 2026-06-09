import { initCrypto } from "./crypto";
import { loadConfig, loadOrGenerateKey } from "./config";
import { runMigrations } from "../db/migrate";

export async function bootstrap() {
  // 1. Load config (creates config.json on first run)
  const cfg = loadConfig();

  // 2. Load/generate encryption key
  const key = loadOrGenerateKey();
  initCrypto(key);

  // 3. Run database migrations (users table, owner_id, etc.)
  runMigrations();

  const hasPassword = !!cfg.passwordHash;
  if (!hasPassword) {
    console.log("⚠  No login password set. Anyone can log in.");
    console.log("   Use /settings in the dashboard to set a password.");
  }
}
