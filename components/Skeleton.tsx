"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-7 w-20 mb-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function ChartCardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="w-full rounded" style={{ height: 160 }} />
      {rows > 1 && <Skeleton className="h-3 w-24 mt-3" />}
    </div>
  );
}
