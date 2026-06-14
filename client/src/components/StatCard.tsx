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
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="rounded-md bg-[var(--muted)] p-2 text-[var(--primary)] shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-[var(--muted-foreground)] truncate">{title}</p>
          <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace)" }}>{value.toLocaleString()}</p>
          {description && (
            <p className="text-[10px] text-[var(--muted-foreground)]">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
