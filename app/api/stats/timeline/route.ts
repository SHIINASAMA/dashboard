import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const accountIds = req.nextUrl.searchParams.get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const data = await getTimeline(days, ids);
  return NextResponse.json(data);
}
