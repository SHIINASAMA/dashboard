export interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  special: boolean;
}

export function validatePassword(pw: string): { valid: boolean; errorKey?: string; rules: PasswordRules } {
  const rules: PasswordRules = {
    length: pw.length >= 12,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw),
  };

  if (!rules.length) return { valid: false, errorKey: "TooShort", rules };
  if (!rules.uppercase) return { valid: false, errorKey: "NeedUppercase", rules };
  if (!rules.lowercase) return { valid: false, errorKey: "NeedLowercase", rules };
  if (!rules.special) return { valid: false, errorKey: "NeedSpecial", rules };

  return { valid: true, rules };
}
