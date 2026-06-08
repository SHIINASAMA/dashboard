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
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-lg bg-[var(--muted)] p-2.5 text-[var(--primary)]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--muted-foreground)] truncate">{title}</p>
          <p className="text-2xl font-bold mt-0.5">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
