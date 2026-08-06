import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { createConfirmToken } from "@/lib/confirm-helpers";

async function POST() {
  return json({ token: createConfirmToken() });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST": return POST();
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
