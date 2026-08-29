import type { ReactNode } from "react";

interface Props {
  cols?: "2-4" | "2-5";
  children: ReactNode;
}

export function StatGrid({ cols = "2-4", children }: Props) {
  const cls = cols === "2-5" ? "grid grid-cols-2 md:grid-cols-5 gap-3" : "grid grid-cols-2 md:grid-cols-4 gap-3";
  return <div className={cls}>{children}</div>;
}
