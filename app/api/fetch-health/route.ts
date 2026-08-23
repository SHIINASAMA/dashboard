import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getFetchHealth } from "@/lib/services/fetch-health";
import { requireSession, getOwnerId } from "@/lib/auth-helpers";

async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getOwnerId(auth.user);
  return json(await getFetchHealth(ownerId));
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
