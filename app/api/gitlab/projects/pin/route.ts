import { NextRequest, NextResponse } from "next/server";
import { setPinnedGitlabProjects } from "@/lib/repositories/gitlab";

export async function PUT(req: NextRequest) {
  const { accountId, projectIds } = await req.json();
  await setPinnedGitlabProjects(accountId, projectIds);
  return NextResponse.json({ ok: true });
}
