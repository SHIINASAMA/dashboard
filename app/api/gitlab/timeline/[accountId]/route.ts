import { NextRequest, NextResponse } from "next/server";
import { getGitlabTimeline } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGitlabTimeline(Number(accountId));
  return NextResponse.json(data);
}
