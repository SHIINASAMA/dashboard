import { json, getRequestCookie } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getUserByUsername } from "@/lib/services/users";
import { getFetchHealth } from "@/lib/services/fetch-health";

async function GET(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByUsername(session.username);
  const ownerId = user && session.role !== "admin" ? user.id : undefined;
  return json(await getFetchHealth(ownerId));
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
