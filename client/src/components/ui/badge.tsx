import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { children?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
