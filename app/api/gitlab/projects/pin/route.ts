import { json } from "@/lib/api-server";
import type { ActionFunctionArgs } from "react-router";
import { setPinnedGitlabProjects } from "@/lib/repositories/gitlab";

async function PUT(req: Request) {
  const { accountId, projectIds } = await req.json();
  await setPinnedGitlabProjects(accountId, projectIds);
  return json({ ok: true });
}

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "PUT": return PUT(request);
    default: return json({ error: "Method not allowed" }, { status: 405 });
  }
}
