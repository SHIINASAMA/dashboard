import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { changePassword, validatePasswordStrength } from "@/lib/auth";
import { requireSession } from "@/lib/auth-helpers";

async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    const strength = validatePasswordStrength(newPassword ?? "");
    if (!strength.valid) {
      return json({ error: "Password does not meet requirements" }, { status: 400 });
    }
    const ok = await changePassword(auth.user.id, currentPassword, newPassword);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800));
      return json({ error: "Current password is incorrect" }, { status: 401 });
    }
    return json({ ok: true });
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
