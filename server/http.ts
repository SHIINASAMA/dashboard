export function fetchWithConfig(url: string, init?: RequestInit & { tls?: { rejectUnauthorized: boolean } }): Promise<Response> {
  return fetch(url, {
    ...init,
    tls: {
      rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED !== "false",
      ...init?.tls,
    },
  } as RequestInit & { tls?: { rejectUnauthorized: boolean } });
}
