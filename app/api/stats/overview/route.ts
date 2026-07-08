import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const accountIds = req.nextUrl.searchParams.get("accountIds");
  const ids = accountIds ? accountIds.split(",").map(Number) : undefined;
  const stats = await getOverviewStats(ids);
  return NextResponse.json(stats);
}
