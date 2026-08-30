import { randomBytes } from "node:crypto";

const TOKEN_TTL_MS = 5 * 60_000;

interface ConfirmEntry {
  userId: number;
  target: number;
  action: string;
  expiresAt: number;
}

// Bound confirmation tokens. Revoked on first successful use and on expiry.
// Stored in-process: for multi-instance deployments this should move to
// Redis/DB, but for the current single-node deployment it is sufficient.
const tokens = new Map<string, ConfirmEntry>();

export function createConfirmToken(userId: number, target: number, action: string): string {
  const token = randomBytes(16).toString("hex");
  tokens.set(token, { userId, target, action, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function validateConfirmToken(
  token: string,
  expected: { userId: number; target: number; action: string },
): boolean {
  const entry = tokens.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return false;
  }
  const ok = (
    entry.userId === expected.userId &&
    entry.target === expected.target &&
    entry.action === expected.action
  );
  // Always consume the token after one validation attempt to prevent replay.
  tokens.delete(token);
  return ok;
}
