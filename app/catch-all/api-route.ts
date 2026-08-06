import { json } from "@/lib/api-server";

/**
 * Resource catch-all for unknown /api/* paths.
 *
 * No default export → React Router treats this as a resource route and
 * returns the loader's Response as-is (JSON 404), instead of rendering an
 * HTML document. Without it, unmatched API URLs throw the dev server's
 * "No route matches URL" error (500).
 */
export async function loader() {
  return json({ error: "Not found" }, { status: 404 });
}
