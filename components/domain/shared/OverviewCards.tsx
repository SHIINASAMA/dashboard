import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
// ArrowUpRight is used in HighlightCard
import { BaseCard, baseCardPadding } from "@/components/ui/BaseCard";
// cn removed — not needed

// 继承式：所有卡片继承 BaseCard 的 variant 与 PADDING，业务不再手写 p-3/p-4
// 抽象维度：展现形式(compact/stat/default/table) × 内容(数值/高亮/表格)

export function CompactCard({ children, className }: { children: ReactNode; className?: string }) {
  return <BaseCard variant="compact" className={className}>{children}</BaseCard>;
}

export function StatCompactCard({
  icon, title, value, description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <BaseCard variant="compact">
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-lg bg-[var(--muted)] p-3 text-[var(--primary)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider leading-4 text-[var(--muted-foreground)]">{title}</p>
          <p className="mt-1 truncate text-xl font-bold leading-7 tabular-nums">{value}</p>
          <p className="truncate text-[11px] leading-4 tabular-nums text-[var(--muted-foreground)]/80">{description}</p>
        </div>
      </div>
    </BaseCard>
  );
}

export function HighlightCard({
  title, icon, children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <BaseCard variant="compact" contentClassName="flex min-h-0 flex-1 flex-col" className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-4 text-[var(--muted-foreground)]">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </p>
        <ArrowUpRight size={14} className="shrink-0 text-[var(--muted-foreground)]" />
      </div>
      <div className="-mx-2 space-y-0.5">{children}</div>
    </BaseCard>
  );
}

export function StatCardBase({
  title, value, icon, description,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}) {
  return (
    <BaseCard variant="stat">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[var(--muted)] p-2.5 text-[var(--primary)] shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)] truncate uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold tabular-nums leading-tight mt-0.5" style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace)" }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
          {description && <p className="text-[11px] text-[var(--muted-foreground)]/80 mt-0.5">{description}</p>}
        </div>
      </div>
    </BaseCard>
  );
}

export function TableCard({ children }: { children: ReactNode }) {
  return <BaseCard variant="table" contentClassName="overflow-x-auto">{children}</BaseCard>;
}

export const CardPadding = baseCardPadding;
