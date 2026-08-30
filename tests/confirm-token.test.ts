import { describe, it, expect, vi } from "vitest";
import { createConfirmToken, validateConfirmToken } from "../lib/confirm-helpers";

describe("bound confirmation tokens", () => {
  it("accepts a token for the matching user, target and action", () => {
    const token = createConfirmToken(7, 42, "delete");
    expect(validateConfirmToken(token, { userId: 7, target: 42, action: "delete" })).toBe(true);
  });

  it("rejects a token bound to another user (IDOR)", () => {
    const token = createConfirmToken(7, 42, "delete");
    expect(validateConfirmToken(token, { userId: 8, target: 42, action: "delete" })).toBe(false);
  });

  it("rejects a token bound to another target account", () => {
    const token = createConfirmToken(7, 42, "delete");
    expect(validateConfirmToken(token, { userId: 7, target: 43, action: "delete" })).toBe(false);
  });

  it("rejects a token bound to a different action", () => {
    const token = createConfirmToken(7, 42, "delete");
    expect(validateConfirmToken(token, { userId: 7, target: 42, action: "suspend" })).toBe(false);
  });

  it("consumes the token after a single use (no replay)", () => {
    const token = createConfirmToken(7, 42, "delete");
    expect(validateConfirmToken(token, { userId: 7, target: 42, action: "delete" })).toBe(true);
    expect(validateConfirmToken(token, { userId: 7, target: 42, action: "delete" })).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    try {
      const token = createConfirmToken(7, 42, "delete");
      // Advance past the 5-minute TTL.
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(validateConfirmToken(token, { userId: 7, target: 42, action: "delete" })).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
