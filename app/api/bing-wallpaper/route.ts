import { json } from "@/lib/api-server";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { fetchWithConfig } from "@/lib/http";

async function GET() {
  try {
    const res = await fetchWithConfig("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
    if (!res.ok) return json({ error: "Failed to fetch wallpaper" }, { status: 502 });
    const data = (await res.json()) as { images?: { url: string }[] };
    const img = data.images?.[0];
    if (!img) return json({ error: "No image" }, { status: 502 });
    throw redirect(`https://www.bing.com${img.url}`);
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });
  return GET();
}
