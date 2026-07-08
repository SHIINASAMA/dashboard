"use client";

import { usePathname } from "next/navigation";

export function NavigatingOverlay() {
  const pathname = usePathname();
  const search = typeof window !== "undefined" ? window.location.search : "";

  return (
    <div key={pathname + search} className="fixed inset-0 z-[9998] bg-[var(--background)]/80 backdrop-blur-sm flex items-center justify-center pointer-events-none" style={{ animation: "overlay-fade 0.6s ease-out forwards" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        <span className="text-sm text-[var(--muted-foreground)]">Loading...</span>
      </div>
    </div>
  );
}
