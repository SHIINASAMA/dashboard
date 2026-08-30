import { describe, it, expect } from "vitest";
import { validateUpstreamUrl } from "../lib/ssrf-guard";
import { assertSafeInstanceUrl } from "../lib/services/accounts";

describe("SSRF guard", () => {
  it("accepts a public https URL", () => {
    expect(validateUpstreamUrl("https://gitlab.com").ok).toBe(true);
    expect(() => assertSafeInstanceUrl("https://gitlab.com")).not.toThrow();
  });

  it("rejects loopback addresses", () => {
    expect(validateUpstreamUrl("http://127.0.0.1:8000").ok).toBe(false);
    expect(() => assertSafeInstanceUrl("http://127.0.0.1:8000")).toThrow();
  });

  it("rejects cloud metadata addresses", () => {
    expect(validateUpstreamUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(() => assertSafeInstanceUrl("http://169.254.169.254/")).toThrow();
  });

  it("rejects internal private ranges", () => {
    expect(validateUpstreamUrl("http://192.168.1.10").ok).toBe(false);
    expect(validateUpstreamUrl("http://10.0.0.5").ok).toBe(false);
    expect(validateUpstreamUrl("http://172.16.0.1").ok).toBe(false);
  });

  it("rejects internal hostnames", () => {
    expect(validateUpstreamUrl("http://localhost:8080").ok).toBe(false);
    expect(validateUpstreamUrl("http://metadata.google.internal").ok).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(validateUpstreamUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateUpstreamUrl("ftp://example.com").ok).toBe(false);
  });
});
