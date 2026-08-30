import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { requireSession } from "@/lib/auth-helpers";
import { deleteUser } from "@/lib/services/users";
import { validateConfirmToken } from "@/lib/confirm-helpers";

async function DELETE(req: Request, params: Record<string, string>) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });
  if (auth.user.role !== "admin") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = params;
  const userId = Number(id);
  if (userId === 1) return json({ error: "Cannot delete the bootstrap admin" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { confirmToken } = body as { confirmToken?: string };
  if (!confirmToken || !validateConfirmToken(confirmToken, {
    userId: auth.user.id,
    target: userId,
    action: "delete",
  })) {
    return json({ error: "Invalid or expired confirmation token" }, { status: 400 });
  }
  await deleteUser(userId);
  return json({ ok: true });
}

export async function action({ request, params }: ActionFunctionArgs) {
  switch (request.method) {
    case "DELETE": return DELETE(request, params as Record<string, string>);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
