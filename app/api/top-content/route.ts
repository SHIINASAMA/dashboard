import { json, getSearchParams, getRequestCookie } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getUserByUsername } from "@/lib/services/users";
import { getAccounts } from "@/lib/services/accounts";
import { getTopContent } from "@/lib/services/top-content";

async function GET(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const requestedDays = Number(getSearchParams(req).get("days")) || 7;
  const days = Math.min(365, Math.max(1, requestedDays));
  const user = await getUserByUsername(session.username);
  const ownerId = user && session.role !== "admin" ? user.id : undefined;
  const accounts = await getAccounts(ownerId);
  return json(await getTopContent(accounts, days));
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
