#!/usr/bin/env node

import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import argon2 from "argon2";
import pg from "pg";

function usage() {
  console.log("Usage: node scripts/reset-admin-password.mjs [username]");
  process.exit(0);
}

if (process.argv.includes("-h") || process.argv.includes("--help")) usage();

if (!process.env.PGHOST && !process.env.DATABASE_URL && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const username = process.argv[2] || "admin";

function databaseConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      database: url.pathname.slice(1),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: url.searchParams.get("sslmode") === "require" ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.PG_HOST || process.env.PGHOST || "localhost",
    port: Number(process.env.PG_PORT || process.env.PGPORT || 5432),
    database: process.env.PG_DB || process.env.PGDATABASE || "dashboard",
    user: process.env.PG_USER || process.env.PGUSER || "dashboard",
    password: process.env.PG_PASSWORD || process.env.PGPASSWORD || "",
  };
}

let promptDisplayed = false;
const mutedOutput = new Writable({
  write(chunk, _encoding, callback) {
    if (!promptDisplayed) {
      promptDisplayed = true;
      process.stdout.write(chunk.toString());
    }
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output: mutedOutput });

async function askHidden(prompt) {
  const answer = await rl.question(prompt);
  promptDisplayed = false;
  process.stdout.write("\n");
  return answer;
}

const password = await askHidden(`New password for ${username}: `);
rl.close();

const client = new pg.Client(databaseConfig());
await client.connect();

try {
  const found = await client.query(
    "SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL",
    [username],
  );
  if (found.rowCount === 0) {
    throw new Error(`Active user not found: ${username}`);
  }

  const passwordHash = await argon2.hash(password);
  await client.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [passwordHash, found.rows[0].id],
  );

  console.log(`Password updated for ${username}. You can now log in.`);
} finally {
  await client.end();
}
