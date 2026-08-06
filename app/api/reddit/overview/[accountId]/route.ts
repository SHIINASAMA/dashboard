import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getRedditOverview } from "@/lib/repositories/reddit";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId } = params;
  const data = await getRedditOverview(Number(accountId));
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
