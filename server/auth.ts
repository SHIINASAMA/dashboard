export default async function checkPassword(password: string): Promise<boolean> {
  const stored = process.env.DASHBOARD_PASSWORD;
  if (!stored) {
    // No password set → any password is accepted (prevents lockout during setup)
    return true;
  }
  try {
    const bcrypt = await import("bcrypt");
    return await bcrypt.compare(password, stored);
  } catch {
    // Fallback: plaintext comparison if bcrypt is not installed
    return password === stored;
  }
}
