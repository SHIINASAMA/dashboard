import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "data/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // `{ field: _, ...rest }` is the codebase-wide pattern for stripping
      // sensitive fields; the rest-sibling is intentionally ignored.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      // Loose-typing files annotate their opt-out; keep that annotation honest.
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-nocheck": "allow-with-description",
        "ts-ignore": "allow-with-description",
      }],
    },
  },
  {
    // Standalone diagnostic scripts operate on untyped Twitter API payloads.
    files: ["scripts/dump-x-data.ts", "scripts/test-fetch-algorithm.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
