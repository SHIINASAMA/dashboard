import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { updateAccount } from "@/lib/services/accounts";
import { isMockMode } from "@/lib/config";
import { dispatchFetch } from "@/lib/fetch-dispatch";
import { requireSession, authorizeAccountOwner } from "@/lib/auth-helpers";

async function POST(req: Request, params: Record<string, string>) {
  const auth = await requireSession(req);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  // Mock/debug mode: no real fetch — pretend it started.
  if (isMockMode()) {
    return json({ ok: true, message: `Mock fetch started for account ${id}` });
  }

  const { authorized, account } = await authorizeAccountOwner(auth.user, Number(id));
  if (!account) return json({ error: "Account not found" }, { status: 404 });
  if (!authorized) return json({ error: "Forbidden" }, { status: 403 });

  if (!account.is_active) {
    await updateAccount(Number(id), { is_active: 1 });
    account.is_active = 1;
  }

  void dispatchFetch(account as never, "manual").catch((e: unknown) =>
    console.error("Background fetch error:", e instanceof Error ? e.message : String(e))
  );
  return json({ ok: true, message: `Fetch started for @${account.screen_name}` });
}

export async function action({ request, params }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST(request, params as Record<string, string>);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
