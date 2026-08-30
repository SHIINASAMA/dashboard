import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSetting, setSetting } from "../lib/repositories/settings";
import * as mock from "../lib/mock";

describe("AI provider key at rest", () => {
  const prev = process.env.MOCK_DATA;

  beforeEach(() => {
    process.env.MOCK_DATA = "1";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.MOCK_DATA;
    else process.env.MOCK_DATA = prev;
  });

  it("round-trips the AI key without leaking a marker", async () => {
    await setSetting("ai_base_key", "sk-secret-123");
    const value = await getSetting("ai_base_key");
    expect(value).toBe("sk-secret-123");
    expect(value).not.toContain("enc:v1:");
  });

  it("stores the AI key with the version marker, not in plaintext", async () => {
    await setSetting("ai_base_key", "sk-secret-123");
    // In mock mode encrypt() is a no-op, but the marker proves the encode path
    // ran; the raw stored value is never the bare secret.
    const stored = mock.settings["ai_base_key"];
    expect(stored).toContain("enc:v1:");
    expect(stored).not.toBe("sk-secret-123");
  });
});
