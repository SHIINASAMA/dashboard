import { NextRequest, NextResponse } from "next/server";
import { getGithubReleaseAssets } from "@/lib/repositories/github";

export async function GET(req: NextRequest, { params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const data = await getGithubReleaseAssets(Number(releaseId));
  return NextResponse.json(data);
}
