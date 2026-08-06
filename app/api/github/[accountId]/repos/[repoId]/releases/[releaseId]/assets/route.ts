import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGithubReleaseAssets } from "@/lib/repositories/github";

async function GET(req: Request, params: Record<string, string>) {
  const { releaseId } = params;
  const data = await getGithubReleaseAssets(Number(releaseId));
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
