/**
 * SSRF protection utilities for validating user-supplied URLs
 * before making server-side requests.
 */

/** IP ranges that are private/internal and should be blocked. */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                    // loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // link-local / cloud metadata
  /^0\./,                      // current network
  /^::1$/,                     // IPv6 loopback
  /^fc00:/,                    // IPv6 ULA
  /^fe80:/,                    // IPv6 link-local
  /^fd00:/,                    // IPv6 ULA
];

/** Hostnames that resolve to internal addresses. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
  "169.254.169.254",
]);

export interface SsrfValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate a URL for SSRF safety before making server-side requests.
 * Checks scheme, hostname, and IP ranges.
 */
export function validateUpstreamUrl(urlString: string): SsrfValidationResult {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  // Only allow http/https
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: `Unsupported protocol: ${url.protocol}` };
  }

  const hostname = url.hostname.toLowerCase();

  // Block known internal hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, error: "Access to internal addresses is not allowed" };
  }

  // Check if hostname looks like an IP address
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    // Validate each octet
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o > 255)) {
      return { ok: false, error: "Invalid IP address" };
    }

    // Check private/internal ranges
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { ok: false, error: "Access to private/internal addresses is not allowed" };
      }
    }
  }

  // Block IPv6 loopback and private ranges (string match for non-IP hostnames)
  if (hostname.includes("::1") || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80")) {
    return { ok: false, error: "Access to internal addresses is not allowed" };
  }

  return { ok: true };
}
