import { NextRequest, NextResponse } from "next/server";
import { getRedditTimeline } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const data = await getRedditTimeline(Number(accountId), days);
  return NextResponse.json(data);
}
