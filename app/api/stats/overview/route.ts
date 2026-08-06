import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getOverviewStats } from "@/lib/repositories/twitter";

async function GET(req: Request) {
  const accountIds = getSearchParams(req).get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const stats = await getOverviewStats(ids);
  return json(stats);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
