import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGithubPaths } from "@/lib/repositories/github";

async function GET(req: Request, params: Record<string, string>) {
  const { accountId, repoId } = params;
  const data = await getGithubPaths(Number(accountId), Number(repoId));
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
