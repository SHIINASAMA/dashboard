import { NextRequest, NextResponse } from "next/server";
import { getGithubTrafficClones } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const data = await getGithubTrafficClones(Number(accountId), Number(repoId), days);
  return NextResponse.json(data);
}
