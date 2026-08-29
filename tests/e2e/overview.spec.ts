import { describe, it, expect } from "vitest";
import * as fs from "node:fs";

describe("overview smoke", () => {
  it("overview page exists", () => {
    expect(fs.existsSync("app/(dashboard)/overview/page.tsx")).toBe(true);
  });
  it("pulse ETag route exists", () => {
    expect(fs.existsSync("app/api/pulse/route.ts")).toBe(true);
  });
});
// Playwright e2e placeholder — run with `pnpm exec playwright test` when installed
// test("overview loads", async ({page})=>{ await page.goto("/"); await expect(page.getByText(/overview/i)).toBeVisible(); });
