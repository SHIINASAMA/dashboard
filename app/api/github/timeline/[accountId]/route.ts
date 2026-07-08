import { NextRequest, NextResponse } from "next/server";
import { getGithubTimeline } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGithubTimeline(Number(accountId));
  return NextResponse.json(data);
}
