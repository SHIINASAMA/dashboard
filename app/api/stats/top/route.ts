import { NextRequest, NextResponse } from "next/server";
import { getTopTweets } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const metric = req.nextUrl.searchParams.get("metric") || "favorite_count";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;
  const tweets = await getTopTweets(metric, limit);
  return NextResponse.json(tweets);
}
