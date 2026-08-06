import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
async function GET(req: Request) {
  // Reddit OAuth callback — redirect to accounts page
  throw redirect(new URL("/accounts", req.url).toString());
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
