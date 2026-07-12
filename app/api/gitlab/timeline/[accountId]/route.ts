import { NextRequest, NextResponse } from "next/server";
import { getGitlabTimeline } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const data = await getGitlabTimeline(Number(accountId), days);
  return NextResponse.json(data);
}
