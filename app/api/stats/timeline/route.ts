import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const months = Number(req.nextUrl.searchParams.get("months")) || 6;
  const accountIds = req.nextUrl.searchParams.get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const data = await getTimeline(months, ids);
  return NextResponse.json(data);
}
