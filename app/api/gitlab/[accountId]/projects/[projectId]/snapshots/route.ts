import { NextRequest, NextResponse } from "next/server";
import { getGitlabProjectSnapshots } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; projectId: string }> }) {
  const { accountId, projectId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const data = await getGitlabProjectSnapshots(Number(accountId), Number(projectId), days);
  return NextResponse.json(data);
}
