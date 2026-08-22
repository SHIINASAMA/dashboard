/**
 * Lightweight markdown-to-HTML for AI chat responses.
 * Handles the most common patterns in LLM output.
 * Content is trusted (from our own AI agent), so innerHTML is safe here.
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

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--primary)] underline">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
