import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { setPinnedRepos } from "@/lib/repositories/github";

async function PUT(req: Request) {
  const { accountId, repoIds } = await req.json();
  await setPinnedRepos(accountId, repoIds);
  return json({ ok: true });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "PUT": return PUT(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
