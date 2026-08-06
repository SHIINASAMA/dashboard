import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGithubPathHistory } from "@/lib/repositories/github";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId, repoId } = params;
  const days = Number(getSearchParams(req).get("days") ?? "30");
  const data = await getGithubPathHistory(Number(accountId), Number(repoId), days);
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
