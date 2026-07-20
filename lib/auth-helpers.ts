import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "./crypto";
import { isMockMode } from "./config";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function createSessionToken(username: string, role: string): Promise<string> {
  if (isMockMode()) return "mock-session-token";
  const secret = getJwtSecret();
  return new SignJWT({ sub: username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function validateSession(token: string): Promise<{ username: string; role: string } | null> {
  if (isMockMode()) return token ? { username: "admin", role: "admin" } : null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const username = payload.sub;
    const role = payload.role as string | undefined;
    if (!username || !role) return null;
    return { username, role };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE };
