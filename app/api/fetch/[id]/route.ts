import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { getAccountById, updateAccount } from "@/lib/services/accounts";
import { isMockMode } from "@/lib/config";
import { dispatchFetch } from "@/lib/fetch-dispatch";

async function POST(req: Request, params: Record<string, string>) {
  const { id } = params;

  // Mock/debug mode: no real fetch — pretend it started.
  if (isMockMode()) {
    return json({ ok: true, message: `Mock fetch started for account ${id}` });
  }

  const account = await getAccountById(Number(id));
  if (!account) return json({ error: "Account not found" }, { status: 404 });
  if (!account.is_active) {
    await updateAccount(Number(id), { is_active: 1 });
    account.is_active = 1;
  }

  void dispatchFetch(account, "manual").catch((e: unknown) =>
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
