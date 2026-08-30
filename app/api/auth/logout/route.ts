import { json, cookieHeader } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";

// Keep logout cookie attributes identical to login so the browser can reliably
// clear the session cookie (same Path / Secure / HttpOnly / SameSite).
const IS_SECURE = process.env.HTTPS !== "false";

async function POST() {
  const setCookie = cookieHeader("dash_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: "lax",
  });
  return json({ ok: true }, { headers: { "set-cookie": setCookie } });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST();
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
