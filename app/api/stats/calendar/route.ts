import { json, getSearchParams } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { getCalendarData } from "@/lib/repositories/twitter";

async function GET(req: Request) {
  const year = Number(getSearchParams(req).get("year")) || new Date().getFullYear();
  const data = await getCalendarData(year);
  return json(data);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET(request);
}
