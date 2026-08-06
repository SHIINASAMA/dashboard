import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getRedditDailyActivity, getRedditDailyCommentActivity } from "@/lib/repositories/reddit";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId } = params;
  const days = Number(getSearchParams(req).get("days") ?? "30");
  const posts = await getRedditDailyActivity(Number(accountId), days);
  const comments = await getRedditDailyCommentActivity(Number(accountId), days);
  return json({ posts, comments });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
