import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { loadConfig } from "../config";
import { dataDir } from "../config";
import { join } from "path";
import * as schema from "../../db/schema/index.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const cfg = loadConfig().database;
    const sqlitePath = cfg.sqlite.path || join(dataDir(), "db", "dashboard.db");
    const client = createClient({ url: `file:${sqlitePath}` });
    client.execute("PRAGMA foreign_keys = ON");
    _db = drizzle(client, { schema });
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
