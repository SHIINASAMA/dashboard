import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getTweets } from "@/lib/repositories/twitter";

async function GET(req: Request) {
  const sp = getSearchParams(req);
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const sort = sp.get("sort") || "created_at";
  const order = sp.get("order") || "desc";
  const search = sp.get("search") || undefined;
  const accountIds = sp.get("accountIds")?.split(",").map(Number);
  const isReply = sp.get("isReply") !== undefined ? Number(sp.get("isReply")) : undefined;

  const data = await getTweets(page, limit, sort, order, search, accountIds, isReply);
  return json(data);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
