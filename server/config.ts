import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

// ── Paths ─────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR
  ? (process.env.DATA_DIR.startsWith("/") ? process.env.DATA_DIR : join(process.cwd(), process.env.DATA_DIR))
  : join(process.cwd(), "data");

export function dataDir(): string {
  mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function dbDir(): string {
  const dir = join(dataDir(), "db");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function dbPath(): string {
  return join(dbDir(), "dashboard.db");
}

export function secretPath(): string {
  return join(dataDir(), ".secret");
}

const CONFIG_PATH = join(dataDir(), "config.json");

// ── Config schema ─────────────────────────────────────────────────

export interface DashboardConfig {
  /** URL prefix for all routes, e.g. "/my-dashboard" */
  urlPrefix: string;

  /** Server listen host */
  host: string;

  /** Server listen port */
  port: number;

  /** Whether to use HTTPS (for cookie secure flag + redirect URI generation) */
  https: boolean;

  /**
   * Argon2id password hash. If empty/absent, login is open.
   * DO NOT edit by hand — use the Settings UI or auth API.
   */
  passwordHash: string;
}

const DEFAULTS: DashboardConfig = {
  urlPrefix: "",
  host: "localhost",
  port: 3001,
  https: false,
  passwordHash: "",
};

// ── Load / save ───────────────────────────────────────────────────

let _config: DashboardConfig | null = null;

export function loadConfig(): DashboardConfig {
  if (_config) return _config;

  mkdirSync(dataDir(), { recursive: true });

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      _config = { ...DEFAULTS, ...raw };
      return _config;
    } catch (e) {
      console.warn("⚠  config.json is corrupt — using defaults");
    }
  }

  // First run — migrate from env vars, generate config.json
  _config = {
    urlPrefix: process.env.DASHBOARD_URL_PREFIX || "",
    host: process.env.HOST || "localhost",
    port: Number(process.env.PORT) || 3001,
    https: process.env.HTTPS === "true",
    passwordHash: "",
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, 2) + "\n", { mode: 0o600 });
  console.log("📄 config.json created at", CONFIG_PATH);
  return _config;
}

export function saveConfig(updates: Partial<DashboardConfig>): DashboardConfig {
  _config = { ...loadConfig(), ...updates };
  writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, 2) + "\n", { mode: 0o600 });
  return _config;
}

// ── Encryption key ────────────────────────────────────────────────

export function loadOrGenerateKey(): string {
  const envKey = process.env.DASHBOARD_SECRET?.trim();
  if (envKey) {
    if (envKey.length !== 64) throw new Error("DASHBOARD_SECRET must be 64 hex characters (32 bytes)");
    return envKey;
  }

  const sp = secretPath();
  if (existsSync(sp)) {
    const key = readFileSync(sp, "utf-8").trim();
    if (key.length === 64) return key;
    console.warn("⚠  data/.secret is corrupt — regenerating");
  }

  const key = randomBytes(32).toString("hex");
  writeFileSync(sp, key + "\n", { mode: 0o600 });
  console.log("🔑 Encryption key generated:", sp);
  return key;
}
