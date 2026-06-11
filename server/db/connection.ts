import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { loadConfig } from "../config";
import * as schema from "../../db/schema/index.js";

let _pgPool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function initPgPool(): Promise<void> {
  const cfg = loadConfig().database;
  if (!cfg) throw new Error("PostgreSQL config missing");
  const { Pool } = await import("pg");
  _pgPool = new Pool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    max: (cfg as any).max ?? 5,
    ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
  });

  const client = await _pgPool.connect();
  client.release();
  console.log("[DB] Connected to PostgreSQL at %s:%d/%s", cfg.host, cfg.port, cfg.database);
}

export function getDb() {
  if (!_db) {
    if (!_pgPool) throw new Error("PostgreSQL pool not initialized. Call initPgPool() first.");
    _db = drizzle(_pgPool, { schema });
  }
  return _db;
}

export function getPgPool(): Pool | null {
  return _pgPool;
}

export async function closeDb() {
  _db = null;
  if (_pgPool) {
    await _pgPool.end();
    _pgPool = null;
  }
}
