import { NextRequest, NextResponse } from "next/server";
import { setPinnedRepos } from "@/lib/repositories/github";

export async function PUT(req: NextRequest) {
  const { accountId, repoIds } = await req.json();
  await setPinnedRepos(accountId, repoIds);
  return NextResponse.json({ ok: true });
}
