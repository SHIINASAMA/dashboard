import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getGithubReleaseDownloadGrowth } from "@/lib/repositories/github";

const ALLOWED_DAYS = new Set([7, 14, 30]);

function parseDays(raw: string | null): number {
  const days = Number(raw ?? "30");
  if (!Number.isFinite(days) || !ALLOWED_DAYS.has(days)) return 30;
  return days;
}

async function GET(req: Request, params: Record<string, string>) {
  const { accountId, repoId } = params;
  const url = new URL(req.url);
  const days = parseDays(url.searchParams.get("days"));
  const data = await getGithubReleaseDownloadGrowth(Number(accountId), Number(repoId), days);
  return json(data);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
