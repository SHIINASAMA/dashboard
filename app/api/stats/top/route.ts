import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getTopTweets } from "@/lib/repositories/twitter";

async function GET(req: Request) {
  const metric = getSearchParams(req).get("metric") || "favorite_count";
  const limit = Number(getSearchParams(req).get("limit")) || 10;
  const tweets = await getTopTweets(metric, limit);
  return json(tweets);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
