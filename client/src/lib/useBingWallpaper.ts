// Own server endpoint that fetches Bing's JSON and returns a 302
// to the actual bing.com CDN image URL. Browser loads image from
// bing.com directly via the redirect — server cost is one 2KB JSON
// request per day (cached by browser's native image cache thereafter).
export function useBingWallpaper() {
  return { url: "/api/bing-wallpaper" };
}
