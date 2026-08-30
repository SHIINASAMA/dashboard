import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { createConfirmToken } from "@/lib/confirm-helpers";
import { requireSession } from "@/lib/auth-helpers";

async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { target?: number; action?: string };
  const target = Number(body.target);
  if (!Number.isInteger(target) || target <= 0) {
    return json({ error: "target is required" }, { status: 400 });
  }
  const action = body.action ?? "delete";
  const token = createConfirmToken(auth.user.id, target, action);
  return json({ token });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
