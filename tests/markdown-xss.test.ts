import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../lib/client/markdown";

describe("markdown sanitizer (XSS)", () => {
  it("escapes raw HTML", () => {
    const out = renderMarkdown("<img src=x onerror=alert(1)>");
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain("&lt;img");
  });

  it("blocks javascript: links", () => {
    const out = renderMarkdown("[click](javascript:alert(1))");
    expect(out).not.toMatch(/href="javascript:/i);
  });

  it("blocks data: links", () => {
    const out = renderMarkdown("[x](data:text/html,<script>alert(1)</script>)");
    expect(out).not.toMatch(/href="data:/i);
  });

  it("blocks vbscript: links", () => {
    const out = renderMarkdown("[x](vbscript:msgbox(1))");
    expect(out).not.toMatch(/href="vbscript:/i);
  });

  it("escapes quote-based attribute injection", () => {
    const out = renderMarkdown('[x]("onmouseover="alert(1))');
    expect(out).not.toMatch(/onmouseover=/i);
  });

  it("keeps safe https links", () => {
    const out = renderMarkdown("[ok](https://example.com)");
    expect(out).toContain('href="https://example.com"');
  });

  it("keeps safe code and bold formatting", () => {
    const out = renderMarkdown("**bold** and `code`");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain(">code</code>");
  });
});
