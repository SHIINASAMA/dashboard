import { NextRequest, NextResponse } from "next/server";
import { getRedditDailyActivity, getRedditDailyCommentActivity } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const posts = await getRedditDailyActivity(Number(accountId));
  const comments = await getRedditDailyCommentActivity(Number(accountId));
  return NextResponse.json({ posts, comments });
}
