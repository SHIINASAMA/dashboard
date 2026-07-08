import { NextRequest, NextResponse } from "next/server";
import { getCalendarData } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const data = await getCalendarData(year);
  return NextResponse.json(data);
}
