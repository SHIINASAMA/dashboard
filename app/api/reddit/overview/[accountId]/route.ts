import { NextRequest, NextResponse } from "next/server";
import { getRedditOverview } from "@/lib/repositories/reddit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getRedditOverview(Number(accountId));
  return NextResponse.json(data);
}
