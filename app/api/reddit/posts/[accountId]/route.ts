import { NextRequest, NextResponse } from "next/server";
import { getRedditPosts } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const sort = sp.get("sort") || "score";
  const data = await getRedditPosts(Number(accountId), page, limit, sort);
  return NextResponse.json(data);
}
