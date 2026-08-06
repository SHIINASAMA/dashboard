import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGithubContributions } from "@/lib/repositories/github";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId } = params;
  const year = getSearchParams(req).get("year") ? Number(getSearchParams(req).get("year")) : undefined;
  const data = await getGithubContributions(Number(accountId), year);
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
