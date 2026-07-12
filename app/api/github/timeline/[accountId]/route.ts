import { NextRequest, NextResponse } from "next/server";
import { getGithubTimeline } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const data = await getGithubTimeline(Number(accountId), days);
  return NextResponse.json(data);
}
