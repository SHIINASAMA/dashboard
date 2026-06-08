import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let _key: Buffer | null = null;

export function initCrypto(keyHex?: string): string {
  if (keyHex) {
    if (keyHex.length !== 64) throw new Error("Encryption key must be 64 hex chars (32 bytes)");
    _key = Buffer.from(keyHex, "hex");
    return keyHex;
  }
  _key = randomBytes(32);
  return _key.toString("hex");
}

function getKey(): Buffer {
  if (!_key) throw new Error("Crypto not initialised — call initCrypto() first");
  return _key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "hex");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function sign(payload: string): string {
  return createHmac("sha256", getKey()).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = Buffer.from(sign(payload), "hex");
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch { return false; }
}
