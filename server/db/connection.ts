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
  if (_db) {
    // libsql client doesn't expose close() directly; the singleton
    // lives for the process lifetime anyway.
  }
  _db = null;
}
