"use client";

import { Check, X } from "lucide-react";
import type { PasswordRules } from "@/lib/client/validatePassword";

interface PasswordHintsProps {
  rules: PasswordRules;
  t: (key: string) => string;
  namespace: string;
}

const RULE_KEYS = [
  { key: "length", i18n: "hintLength" },
  { key: "uppercase", i18n: "hintUppercase" },
  { key: "lowercase", i18n: "hintLowercase" },
  { key: "special", i18n: "hintSpecial" },
] as const;

export function PasswordHints({ rules, t, namespace }: PasswordHintsProps) {
  return (
    <ul className="space-y-0.5">
      {RULE_KEYS.map(({ key, i18n }) => (
        <li key={key} className="flex items-center gap-1.5 text-xs">
          {rules[key] ? (
            <Check size={12} className="text-[var(--success)]" />
          ) : (
            <X size={12} className="text-[var(--danger)]" />
          )}
          <span className={rules[key] ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}>
            {t(`${namespace}.${i18n}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
