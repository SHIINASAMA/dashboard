import { NextRequest, NextResponse } from "next/server";
import { getTweets } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const sort = sp.get("sort") || "created_at";
  const order = sp.get("order") || "desc";
  const search = sp.get("search") || undefined;
  const accountIds = sp.get("accountIds")?.split(",").map(Number);
  const isReply = sp.get("isReply") !== undefined ? Number(sp.get("isReply")) : undefined;

  const data = await getTweets(page, limit, sort, order, search, accountIds, isReply);
  return NextResponse.json(data);
}
