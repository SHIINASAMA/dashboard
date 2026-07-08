import { NextRequest, NextResponse } from "next/server";
import { getGithubPathHistory } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const data = await getGithubPathHistory(Number(accountId), Number(repoId));
  return NextResponse.json(data);
}
