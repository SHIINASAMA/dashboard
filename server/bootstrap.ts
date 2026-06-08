import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "..", "data");
const SECRET_FILE = join(DATA_DIR, ".secret");

/**
 * Load or generate the encryption key.
 *  1. DASHBOARD_SECRET env var (override for migration/rotation)
 *  2. data/.secret file (auto-generated on first run)
 *  3. Generate new key, persist to data/.secret, log it
 */
export function loadOrGenerateKey(): string {
  // 1. Env var override
  const envKey = process.env.DASHBOARD_SECRET?.trim();
  if (envKey) {
    if (envKey.length !== 64) {
      throw new Error("DASHBOARD_SECRET must be 64 hex characters (32 bytes)");
    }
    return envKey;
  }

  // 2. File exists
  if (existsSync(SECRET_FILE)) {
    const key = readFileSync(SECRET_FILE, "utf-8").trim();
    if (key.length === 64) return key;
    console.warn("⚠  data/.secret is corrupt — regenerating");
  }

  // 3. Generate
  const key = randomBytes(32).toString("hex");
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SECRET_FILE, key + "\n", { mode: 0o600 });
  console.log("🔑 Encryption key generated and saved to data/.secret");

  return key;
}

/**
 * Load or generate the login password hash.
 *  1. settings table entry 'password_hash' (bcrypt, stored in DB)
 *  2. Generate random password, hash it, store hash in DB, log plaintext ONCE
 *
 * If no password is set, anyone can log in (convenience for fresh installs).
 * The user should change the password via Settings UI on first login.
 */
export async function loadOrGeneratePassword(getSetting: (k: string) => string | null, setSetting: (k: string, v: string) => void): Promise<void> {
  const existing = getSetting("password_hash");
  if (existing) return; // Already set

  // No password set — login is open
  // We don't auto-generate; the user can set one via the UI
  // If they want one, they can run: bun run server/set-password.ts
}
