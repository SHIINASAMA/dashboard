import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".react-router/**",
      "build/**",
      ".next/**",
      "node_modules/**",
      "public/**",
      "data/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs["recommended-latest"],
  {
    rules: {
      // `{ field: _, ...rest }` is the codebase-wide pattern for stripping
      // sensitive fields; the rest-sibling is intentionally ignored.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      // Loose-typing files annotate their opt-out; keep that annotation honest.
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-nocheck": "allow-with-description",
        "ts-ignore": "allow-with-description",
      }],
    },
  },
  {
    // Plain Node ESM entry (server/index.mjs) — no TS parser, so give it the
    // handful of runtime globals it references.
    files: ["server/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    // Standalone diagnostic scripts operate on untyped Twitter API payloads.
    files: ["scripts/dump-x-data.ts", "scripts/test-fetch-algorithm.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
