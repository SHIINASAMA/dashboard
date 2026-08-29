import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionShell({ icon, title, action, children }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[var(--muted-foreground)]">
          {icon} {title}
        </h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
