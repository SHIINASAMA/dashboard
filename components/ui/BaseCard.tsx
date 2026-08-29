import { Card, CardContent } from "./card";
import type { ReactNode } from "react";
import { cn } from "@/lib/client/utils";

type Variant = "compact" | "stat" | "default" | "table";

const PADDING: Record<Variant, string> = {
  compact: "p-4 pt-4 sm:p-4 sm:pt-4",
  stat: "p-3 pt-3 sm:p-4 sm:pt-4",
  default: "p-4 pt-4 sm:p-6 sm:pt-6",
  table: "p-0 pt-4 pb-4 sm:pt-4 sm:pb-4", // table: outer 16px top/bottom, 0 sides, cells provide sides
};

interface BaseCardProps {
  variant?: Variant;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  hover?: boolean;
}

export function BaseCard({
  variant = "default",
  className,
  contentClassName,
  children,
  hover = true,
}: BaseCardProps) {
  return (
    <Card className={cn(hover && "transition-colors hover:bg-[var(--muted)]/50", className)}>
      <CardContent className={cn(PADDING[variant], contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export const baseCardPadding = PADDING;
