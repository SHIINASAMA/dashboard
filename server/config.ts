import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

// ── Paths ─────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR
  ? (process.env.DATA_DIR.startsWith("/") ? process.env.DATA_DIR : join(process.cwd(), process.env.DATA_DIR))
  : join(process.cwd(), "data");

export function logDir(): string {
  return process.env.LOG_DIR
    ? (process.env.LOG_DIR.startsWith("/") ? process.env.LOG_DIR : join(process.cwd(), process.env.LOG_DIR))
    : join(dataDir(), "logs");
}

export function logLevel(): string {
  return process.env.LOG_LEVEL || "info";
}

export function logMaxSize(): string {
  return process.env.LOG_MAX_SIZE || "10m";
}

export function logMaxFiles(): number {
  return Number(process.env.LOG_MAX_FILES) || 5;
}

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

export interface LogConfig {
  /** Log output directory */
  dir: string;
  /** Minimum log level: trace/debug/info/warn/error/fatal */
  level: string;
  /** Max file size before rotation (e.g. "10m", "100m") */
  maxSize: string;
  /** Number of rotated files to keep */
  maxFiles: number;
}

export interface DatabaseConfig {
  /** Database driver: "sqlite" (tested) or "postgresql" (future) */
  driver: "sqlite" | "postgresql";
  sqlite: { path: string };
  postgresql?: { host: string; port: number; database: string; user: string; password: string };
}

export interface DashboardConfig {
  /** Server listen host */
  host: string;

  /** Server listen port */
  port: number;

  /** Whether to use HTTPS (for cookie secure flag + redirect URI generation) */
  https: boolean;

  /**
   * Allowed CORS origins for cross-origin requests.
   * Default empty = no CORS (same-origin only, recommended for production).
   * Set to ["*"] to allow all, or list specific origins e.g. ["https://example.com"].
   */
  allowedOrigins: string[];

  /**
   * Argon2id password hash. If empty/absent, login is open.
   * DO NOT edit by hand — use the Settings UI or auth API.
   * DEPRECATED: password hash is migrating to the users table.
   */
  passwordHash: string;

  /** Database configuration */
  database: DatabaseConfig;

  /** Log configuration */
  log: LogConfig;
}

const DEFAULTS: DashboardConfig = {
  host: "localhost",
  port: 3001,
  https: false,
  allowedOrigins: [],
  passwordHash: "",
  database: {
    driver: "sqlite",
    sqlite: { path: "" }, // set after dataDir() is initialized
  },
  log: {
    dir: "",  // set after dataDir() is initialized
    level: logLevel(),
    maxSize: logMaxSize(),
    maxFiles: logMaxFiles(),
  },
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
      // Ensure nested defaults for migrated config (log, database)
      _config.log = { ...DEFAULTS.log, ...(_config.log || {}) };
      _config.database = { ...DEFAULTS.database, ...(_config.database || {}) };
      if (!_config.log.dir) _config.log.dir = logDir();
      return _config;
    } catch (e) {
      console.warn("⚠  config.json is corrupt — using defaults");
    }
  }

  // First run
  _config = {
    host: process.env.HOST || "localhost",
    port: Number(process.env.PORT) || 3001,
    https: process.env.HTTPS === "true",
    allowedOrigins: [],
    passwordHash: "",
    database: {
      driver: "sqlite",
      sqlite: { path: join(dataDir(), "db", "dashboard.db") },
    },
    log: {
      dir: logDir(),
      level: logLevel(),
      maxSize: logMaxSize(),
      maxFiles: logMaxFiles(),
    },
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(_config, null, 2) + "\n", { mode: 0o600 });
  console.log("📄 config.json created at", CONFIG_PATH);
  return _config;
}

export function saveConfig(updates: Partial<DashboardConfig>): DashboardConfig {
  _config = { ...loadConfig(), ...updates };
  // Set default sqlite path if not configured
  if (!_config.database.sqlite.path) {
    _config.database.sqlite.path = join(dataDir(), "db", "dashboard.db");
  }
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
