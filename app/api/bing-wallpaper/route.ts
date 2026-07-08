import { NextResponse } from "next/server";
import { fetchWithConfig } from "@/lib/http";

export async function GET() {
  try {
    const res = await fetchWithConfig("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch wallpaper" }, { status: 502 });
    const data = (await res.json()) as { images?: { url: string }[] };
    const img = data.images?.[0];
    if (!img) return NextResponse.json({ error: "No image" }, { status: 502 });
    return NextResponse.redirect(`https://www.bing.com${img.url}`, 302);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
