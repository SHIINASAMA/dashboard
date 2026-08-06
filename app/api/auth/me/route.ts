import { json, getRequestCookie } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { isMockMode } from "@/lib/config";

async function GET(req: Request) {
  if (isMockMode()) {
    return json({ authenticated: true, username: "admin", role: "admin" });
  }
  const token = getRequestCookie(req, "dash_session");
  if (!token) return json({ authenticated: false });
  const session = await validateSession(token);
  if (!session) return json({ authenticated: false });
  return json({ authenticated: true, username: session.username, role: session.role });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
