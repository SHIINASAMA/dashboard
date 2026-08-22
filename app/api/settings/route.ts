import { json, getRequestCookie } from "@/lib/api-server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { validateSession } from "@/lib/auth-helpers";
import { getSetting, setSetting } from "@/lib/repositories/settings";
import { aiConfig } from "@/lib/config";

async function requireAdmin(req: Request) {
  const token = getRequestCookie(req, "dash_session");
  const session = token ? await validateSession(token) : null;
  if (!session || session.role !== "admin") return null;
  return session;
}

async function GET(req: Request) {
  if (!(await requireAdmin(req))) return json({ error: "Forbidden" }, { status: 403 });
  const baseUrl = await getSetting("ai_base_url");
  const baseKey = await getSetting("ai_base_key");
  const model = await getSetting("ai_model");
  return json({
    ai: {
      baseUrl: baseUrl || "",
      apiKey: baseKey ? "••••••••" : "",
      model: model || aiConfig().model,
    },
  });
}

async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return json({ error: "Forbidden" }, { status: 403 });
  const { baseUrl, apiKey, model } = await req.json();
  if (baseUrl !== undefined) await setSetting("ai_base_url", baseUrl);
  if (apiKey !== undefined && apiKey !== "••••••••") await setSetting("ai_base_key", apiKey);
  if (model !== undefined) await setSetting("ai_model", model);
  return json({ ok: true });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "GET") return GET(request);
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "PUT") return PUT(request);
  return json({ error: "Method not allowed" }, { status: 405 });
}
