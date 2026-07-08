import { NextRequest, NextResponse } from "next/server";
import { getGithubOverview } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const data = await getGithubOverview(Number(accountId));
  return NextResponse.json(data);
}
