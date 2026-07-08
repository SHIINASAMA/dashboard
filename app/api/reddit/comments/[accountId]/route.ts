import { NextRequest, NextResponse } from "next/server";
import { getRedditComments } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const data = await getRedditComments(Number(accountId), page, limit);
  return NextResponse.json(data);
}
