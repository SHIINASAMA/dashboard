"use client";

import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();

  return (
    <div key={pathname + location.search} className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div className="nav-bar h-full rounded-r-full" style={{
        background: "linear-gradient(90deg, var(--primary), color-mix(in oklch, var(--primary) 60%, var(--chart-2)))",
        boxShadow: "0 0 12px color-mix(in oklch, var(--primary) 50%, transparent)",
      }} />
    </div>
  );
}
