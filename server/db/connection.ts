import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { loadConfig } from "../config";
import { dataDir } from "../config";
import { join } from "path";
import * as schema from "../../db/schema/index.js";

let _client: Client | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getClient(): Client {
  if (!_client) {
    const cfg = loadConfig().database;
    const sqlitePath = cfg.sqlite.path || join(dataDir(), "db", "dashboard.db");
    _client = createClient({ url: `file:${sqlitePath}` });
    _client.execute("PRAGMA foreign_keys = ON");
  }
  return _client;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export function closeDb() {
  _db = null;
  _client = null;
}

/** Replace the global DB client with an in-memory SQLite database for testing.
 *  Call before each test suite that queries the database. */
export async function initTestDb() {
  closeDb();
  const tmpPath = `/tmp/dashboard_test_${Date.now()}.db`;
  _client = createClient({ url: `file:${tmpPath}` });
  await _client.execute("PRAGMA foreign_keys = ON");
  _db = drizzle(_client, { schema });
}
