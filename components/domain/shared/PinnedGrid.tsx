import type { ReactNode } from "react";

export function PinnedGrid({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">{children}</div>
    </div>
  );
}
