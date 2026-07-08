import { NextRequest, NextResponse } from "next/server";
import { getTweetById } from "@/lib/repositories/twitter";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tweet = await getTweetById(id);
  if (!tweet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tweet);
}
