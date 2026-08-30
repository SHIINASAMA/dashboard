import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "../lib/auth";

describe("server-side password policy", () => {
  it("accepts a compliant password", () => {
    expect(validatePasswordStrength("Abcdefgh123!").valid).toBe(true);
  });

  it("rejects a too-short password", () => {
    expect(validatePasswordStrength("Ab1!").valid).toBe(false);
    expect(validatePasswordStrength("Ab1!").errorKey).toBe("TooShort");
  });

  it("rejects a password without an uppercase letter", () => {
    expect(validatePasswordStrength("abcdefgh123!").valid).toBe(false);
    expect(validatePasswordStrength("abcdefgh123!").errorKey).toBe("NeedUppercase");
  });

  it("rejects a password without a lowercase letter", () => {
    expect(validatePasswordStrength("ABCDEFGH123!").valid).toBe(false);
    expect(validatePasswordStrength("ABCDEFGH123!").errorKey).toBe("NeedLowercase");
  });

  it("rejects a password without a special character", () => {
    expect(validatePasswordStrength("Abcdefgh1234").valid).toBe(false);
    expect(validatePasswordStrength("Abcdefgh1234").errorKey).toBe("NeedSpecial");
  });
});
