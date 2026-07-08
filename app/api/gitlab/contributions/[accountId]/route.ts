import { NextRequest, NextResponse } from "next/server";
import { getGitlabContributions } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const year = req.nextUrl.searchParams.get("year") ? Number(req.nextUrl.searchParams.get("year")) : undefined;
  const data = await getGitlabContributions(Number(accountId), year);
  return NextResponse.json(data);
}
