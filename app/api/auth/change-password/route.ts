import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { changePassword } from "@/lib/auth";

async function POST(req: Request) {
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 4) {
      return json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    const ok = await changePassword(currentPassword, newPassword);
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
