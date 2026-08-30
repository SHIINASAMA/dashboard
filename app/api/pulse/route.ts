import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getAccounts } from "@/lib/services/accounts";
import { getPulse } from "@/lib/services/pulse";
import { requireSession, getOwnerId } from "@/lib/auth-helpers";
import { createHash } from "node:crypto";

function etagFor(pulse: unknown): string {
  const h = createHash("sha256").update(JSON.stringify(pulse)).digest("hex").slice(0, 16);
  return `"${h}"`;
}

async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const requestedDays = Number(getSearchParams(req).get("days")) || 7;
  const days = Math.min(365, Math.max(1, requestedDays));
  const ownerId = getOwnerId(auth.user);
  const accounts = await getAccounts(ownerId);
  const pulse = await getPulse(accounts, days);
  const etag = etagFor(pulse);
  const ifNoneMatch = req.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return json(pulse, {
    headers: {
      ETag: etag,
      // Per-user data: never let a shared cache serve one user's pulse to
      // another. The ETag still allows the SAME browser to revalidate.
      "Cache-Control": "private, no-store",
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
