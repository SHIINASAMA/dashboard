
import { describe, it, expect } from "vitest";
import { Stars, Forks } from "../lib/domain/repo";

describe("Stars/Forks ValueObjects", () => {
  it("rejects negative Stars", () => {
    expect(() => new Stars(-1)).toThrow();
  });
  it("rejects negative Forks", () => {
    expect(() => new Forks(-5)).toThrow();
  });
  it("delta calculates correctly", () => {
    expect(new Stars(100).delta(new Stars(80))).toBe(20);
    expect(new Forks(10).delta(new Forks(12))).toBe(-2);
  });
  it("value is readonly", () => {
    const s = new Stars(42);
    expect(s.value).toBe(42);
  });
});
