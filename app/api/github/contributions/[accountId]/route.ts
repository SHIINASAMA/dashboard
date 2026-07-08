import { NextRequest, NextResponse } from "next/server";
import { getGithubContributions } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const year = req.nextUrl.searchParams.get("year") ? Number(req.nextUrl.searchParams.get("year")) : undefined;
  const data = await getGithubContributions(Number(accountId), year);
  return NextResponse.json(data);
}
