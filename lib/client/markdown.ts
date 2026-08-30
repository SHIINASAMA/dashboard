/**
 * Lightweight markdown-to-HTML for AI chat responses.
 * Handles the most common patterns in LLM output, then sanitizes the result.
 *
 * NOTE: we render through dangerouslySetInnerHTML in the UI, so output must be
 * safe against XSS regardless of where the content originated. AI output and
 * echoed user input are both attacker-influenceable; do NOT treat content as
 * trusted. We only allow http/https (and mailto) link schemes and escape every
 * HTML-significant character up-front.
 */
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks: ```lang\n...\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : "";
    return `<pre class="rounded-lg bg-[var(--muted)] p-3 my-2 overflow-x-auto text-sm"><code${cls}>${code.trim()}</code></pre>`;
  });

  // Inline code: `...`
  html = html.replace(/`([^`\n]+)`/g, '<code class="rounded bg-[var(--muted)] px-1.5 py-0.5 text-sm">$1</code>');

  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *...*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Headers: ### ... / ## ... / # ...
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>');

  // Unordered lists: - ...
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered lists: 1. ...
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Links: [text](url) — only allow safe schemes; drop unsafe ones.
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, rawUrl) => {
    const href = sanitizeUrl(String(rawUrl).trim());
    if (!href) return label;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-[var(--primary)] underline">${label}</a>`;
  });

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Return a safe href for a markdown link, or null if the target is unsafe.
 * Blocks javascript:, data:, vbscript:, and relative/empty targets so they
 * cannot be used to smuggle a handler or executable scheme into an attribute.
 */
function sanitizeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not an absolute URL, so we cannot prove its scheme — reject it.
    return null;
  }
  const proto = parsed.protocol.toLowerCase();
  if (proto === "http:" || proto === "https:" || proto === "mailto:") {
    return url;
  }
  return null;
}
