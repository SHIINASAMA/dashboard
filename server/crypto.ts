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

function toU8(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function concatToU8(...bufs: (Buffer | Uint8Array)[]): Uint8Array {
  const total = bufs.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of bufs) {
    result.set(buf instanceof Uint8Array ? buf : toU8(buf), offset);
    offset += buf.length;
  }
  return result;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, toU8(key), toU8(iv), { authTagLength: TAG_LEN } as any);
  const encrypted = concatToU8(cipher.update(plaintext, "utf8"), cipher.final());
  const tag = toU8(cipher.getAuthTag());
  return concatToU8(iv, tag, Buffer.from(encrypted)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "hex");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, toU8(key), toU8(iv), { authTagLength: TAG_LEN } as any);
  decipher.setAuthTag(tag as any);
  const decrypted = concatToU8(decipher.update(toU8(encrypted)), decipher.final());
  return Buffer.from(decrypted).toString("utf8");
}

export function sign(payload: string): string {
  return createHmac("sha256", toU8(getKey())).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = Buffer.from(sign(payload), "hex");
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected as any, actual as any);
  } catch { return false; }
}

/** Return the 32-byte key as Uint8Array for use with jose JWT */
export function getJwtSecret(): Uint8Array {
  return toU8(getKey());
}
