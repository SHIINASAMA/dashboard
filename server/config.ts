import { join } from "path";
import { mkdirSync } from "fs";

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

// ── Types ──────────────────────────────────────────────────────────

export interface LogConfig {
  dir: string;
  level: string;
  maxSize: string;
  maxFiles: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  ssl?: boolean;
}

export interface DashboardConfig {
  host: string;
  port: number;
  https: boolean;
  allowedOrigins: string[];
  passwordHash: string;
  database: DatabaseConfig;
  log: LogConfig;
}

// ── Parse DATABASE_URL ─────────────────────────────────────────────

function parseDbUrl(url: string): DatabaseConfig | null {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || "5432"),
      database: u.pathname.slice(1) || "dashboard",
      user: u.username || "dashboard",
      password: u.password || "",
      ssl: u.searchParams.get("sslmode") === "require",
    };
  } catch {
    return null;
  }
}

// ── Config (env-only, no filesystem persistence) ────────────────────

let _config: DashboardConfig | null = null;

export function loadConfig(): DashboardConfig {
  if (_config) return _config;

  // DATABASE_URL takes priority; fall back to individual PG_* vars
  const dbUrl = process.env.DATABASE_URL?.trim();
  const dbConfig = dbUrl ? parseDbUrl(dbUrl) ?? defaultDb() : defaultDb();

  _config = {
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT) || 3001,
    https: process.env.HTTPS === "true",
    allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
    passwordHash: process.env.ADMIN_PASSWORD_HASH?.trim() || "",
    database: dbConfig,
    log: {
      dir: logDir(),
      level: logLevel(),
      maxSize: logMaxSize(),
      maxFiles: logMaxFiles(),
    },
  };
  return _config;
}

function defaultDb(): DatabaseConfig {
  return {
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    database: process.env.PG_DB || "dashboard",
    user: process.env.PG_USER || "dashboard",
    password: process.env.PG_PASSWORD || "",
  };
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

// ── Encryption key ─────────────────────────────────────────────────

export function loadOrGenerateKey(): string {
  const envKey = process.env.DASHBOARD_SECRET?.trim();
  if (!envKey) throw new Error("DASHBOARD_SECRET environment variable is required");
  if (envKey.length !== 64) throw new Error("DASHBOARD_SECRET must be 64 hex characters (32 bytes)");
  return envKey;
}
