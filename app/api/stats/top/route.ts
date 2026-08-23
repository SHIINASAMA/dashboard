import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getTopTweets } from "@/lib/repositories/twitter";
import { requireSession } from "@/lib/auth-helpers";

async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const metric = getSearchParams(req).get("metric") || "favorite_count";
  const limit = Number(getSearchParams(req).get("limit")) || 10;
  const tweets = await getTopTweets(metric, limit);
  return json(tweets);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
