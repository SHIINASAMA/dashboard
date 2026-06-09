import { Hono } from "hono";
import { randomBytes } from "crypto";

const tokens = new Map<string, number>();

// Clean expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of tokens) {
    if (expiry < now) tokens.delete(token);
  }
}, 60_000);

const confirmRouter = new Hono();

confirmRouter.post("/token", (c) => {
  const token = randomBytes(16).toString("hex"); // 32 hex chars, 128 bits entropy
  tokens.set(token, Date.now() + 5 * 60_000);
  return c.json({ token });
});

export function validateConfirmToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry || expiry < Date.now()) return false;
  tokens.delete(token);
  return true;
}

export default confirmRouter;
