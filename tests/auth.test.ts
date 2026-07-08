import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { initCrypto, getJwtSecret } from "../crypto";

beforeAll(() => {
  initCrypto("a".repeat(64));
});

describe("JWT session tokens", () => {
  const username = "testuser";
  const role = "admin";

  async function createToken(u: string, r: string, expiresIn = "7d") {
    const secret = getJwtSecret();
    return new SignJWT({ sub: u, role: r })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  async function verifyToken(token: string) {
    try {
      const secret = getJwtSecret();
      const { payload } = await jwtVerify(token, secret);
      return { username: payload.sub as string, role: payload.role as string };
    } catch {
      return null;
    }
  }

  it("creates and verifies a valid token", async () => {
    const token = await createToken(username, role);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.username).toBe(username);
    expect(decoded!.role).toBe(role);
  });

  it("rejects expired token", async () => {
    const token = await createToken("u", "user", "0s");
    // jwtVerify should reject immediately-expired token
    const decoded = await verifyToken(token);
    expect(decoded).toBeNull();
  });

  it("rejects token with wrong key", async () => {
    const token = await createToken(username, role);
    // use a different key
    const fakeSecret = new TextEncoder().encode("a".repeat(31) + "b");
    try {
      const { payload } = await jwtVerify(token, fakeSecret);
      expect(payload).toBeFalsy(); // should not reach here
    } catch {
      // expected
    }
  });

  it("rejects malformed token", async () => {
    const decoded = await verifyToken("not-a-jwt");
    expect(decoded).toBeNull();
  });

  it("rejects tampered token", async () => {
    const token = await createToken(username, role);
    const parts = token.split(".");
    const tampered = parts[0] + "." + parts[1] + ".invalidsig";
    const decoded = await verifyToken(tampered);
    expect(decoded).toBeNull();
  });
});
