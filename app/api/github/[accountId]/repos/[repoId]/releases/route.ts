import { NextRequest, NextResponse } from "next/server";
import { getGithubReleases } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ accountId: string; repoId: string }> }) {
  const { accountId, repoId } = await params;
  const data = await getGithubReleases(Number(accountId), Number(repoId));
  return NextResponse.json(data);
}
