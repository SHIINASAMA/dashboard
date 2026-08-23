import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getAccounts } from "@/lib/services/accounts";
import { getTopContent } from "@/lib/services/top-content";
import { requireSession, getOwnerId } from "@/lib/auth-helpers";

async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const requestedDays = Number(getSearchParams(req).get("days")) || 7;
  const days = Math.min(365, Math.max(1, requestedDays));
  const ownerId = getOwnerId(auth.user);
  const accounts = await getAccounts(ownerId);
  return json(await getTopContent(accounts, days));
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
