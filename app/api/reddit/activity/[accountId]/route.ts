import { NextRequest, NextResponse } from "next/server";
import { getRedditDailyActivity, getRedditDailyCommentActivity } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const posts = await getRedditDailyActivity(Number(accountId), days);
  const comments = await getRedditDailyCommentActivity(Number(accountId), days);
  return NextResponse.json({ posts, comments });
}
