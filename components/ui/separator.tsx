"use client";

import { cn } from "@/lib/client/utils";

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-t border-[var(--border)]", className)} />;
}
