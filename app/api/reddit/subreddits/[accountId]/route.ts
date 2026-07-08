import { NextRequest, NextResponse } from "next/server";
import { getRedditSubredditDistribution } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getRedditSubredditDistribution(Number(accountId));
  return NextResponse.json(data);
}
