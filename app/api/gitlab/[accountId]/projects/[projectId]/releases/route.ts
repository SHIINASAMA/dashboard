import { NextRequest, NextResponse } from "next/server";
import { getGitlabReleases } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; projectId: string }> }) {
  const { accountId, projectId } = await params;
  const data = await getGitlabReleases(Number(accountId), Number(projectId));
  return NextResponse.json(data);
}
