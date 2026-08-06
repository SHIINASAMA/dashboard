import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
async function GET() {
  return json({ status: "ok" });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET();
}
