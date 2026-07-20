"use client";

// Small fixed badge shown when the app runs in mock/debug mode
// (NEXT_PUBLIC_MOCK_DATA set at build/dev time). Signals that all data is
// synthetic fixtures, not a real backend.
export function MockModeBanner() {
  if (process.env.NEXT_PUBLIC_MOCK_DATA !== "1" && process.env.NEXT_PUBLIC_MOCK_DATA !== "true") {
    return null;
  }
  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] select-none rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-600 shadow-sm backdrop-blur dark:text-amber-400"
      title="Serving fixture data — no backend connected"
    >
      ⚠ MOCK MODE — fixture data
    </div>
  );
}
