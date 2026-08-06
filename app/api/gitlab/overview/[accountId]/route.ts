import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGitlabOverview } from "@/lib/repositories/gitlab";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId } = params;
  const data = await getGitlabOverview(Number(accountId));
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
