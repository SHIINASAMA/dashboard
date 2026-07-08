import { NextRequest, NextResponse } from "next/server";
import { getGitlabOverview } from "@/lib/repositories/gitlab";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGitlabOverview(Number(accountId));
  return NextResponse.json(data);
}
