import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getTimeline } from "@/lib/repositories/twitter";

async function GET(req: Request) {
  const days = Number(getSearchParams(req).get("days")) || 30;
  const accountIds = getSearchParams(req).get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const data = await getTimeline(days, ids);
  return json(data);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
