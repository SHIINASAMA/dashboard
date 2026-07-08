const tokens = new Map<string, number>();

export function createConfirmToken(): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  tokens.set(token, Date.now() + 5 * 60_000);
  return token;
}

export function validateConfirmToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token);
  return true;
}
