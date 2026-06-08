import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "crypto";

/**
 * Cryptographic utilities for the dashboard.
 *
 * Encryption: AES-256-GCM with a random 12-byte IV.
 * The encryption key is derived from the DASHBOARD_SECRET environment variable
 * (must be 64 hex characters / 32 bytes). If not set, the server will refuse to start.
 *
 * The DB only stores the ciphertext (iv + authTag + encrypted, all hex-encoded).
 * The plaintext token is never persisted.
 */

function getKey(): Buffer {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) {
    throw new Error(
      "DASHBOARD_SECRET is not set. Generate one with: bun -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (secret.length !== 64) {
    throw new Error("DASHBOARD_SECRET must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(secret, "hex");
}

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Encrypt a plaintext string. Returns a hex string containing iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Concatenate: iv (12 bytes) + authTag (16 bytes) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

/**
 * Decrypt a hex string produced by encrypt(). Returns the original plaintext.
 * Throws if the tag is invalid (tampered or wrong key).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "hex");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext: too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/**
 * Sign a payload (e.g. username + expiry) with HMAC-SHA256.
 * Returns hex signature. Used for login session tokens.
 */
export function sign(payload: string): string {
  const key = getKey();
  return createHmac("sha256", key).update(payload).digest("hex");
}

/**
 * Verify an HMAC-SHA256 signature with timing-safe comparison.
 */
export function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = Buffer.from(sign(payload), "hex");
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
