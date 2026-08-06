import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getTweetById } from "@/lib/repositories/twitter";

async function GET(req: Request, params: Record<string, string>) {
  const { id } = params;
  const tweet = await getTweetById(id);
  if (!tweet) return json({ error: "Not found" }, { status: 404 });
  return json(tweet);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request, params as Record<string, string>);
}
