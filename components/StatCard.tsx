import { Card, CardContent } from "./ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}

export function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="overflow-hidden transition-colors hover:bg-[var(--muted)]/50">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className="rounded-lg bg-[var(--muted)] p-2.5 text-[var(--primary)] shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)] truncate uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold tabular-nums leading-tight mt-0.5" style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace)" }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
          {description && (
            <p className="text-[11px] text-[var(--muted-foreground)]/80 mt-0.5">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
