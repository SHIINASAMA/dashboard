import { json, cookieHeader } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
async function POST() {
  const setCookie = cookieHeader("dash_session", "", { path: "/", maxAge: 0 });
  return json({ ok: true }, { headers: { "set-cookie": setCookie } });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST();
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
