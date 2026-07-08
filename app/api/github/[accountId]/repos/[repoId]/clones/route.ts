import { NextRequest, NextResponse } from "next/server";
import { getGithubTrafficClones } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const data = await getGithubTrafficClones(Number(accountId), Number(repoId));
  return NextResponse.json(data);
}
