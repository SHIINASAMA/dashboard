"use client";

import { useTranslation } from "react-i18next";

const OPTIONS: { value: number; labelKey: string }[] = [
  { value: 7, labelKey: "timeRange.7d" },
  { value: 30, labelKey: "timeRange.30d" },
  { value: 90, labelKey: "timeRange.90d" },
  { value: 180, labelKey: "timeRange.180d" },
  { value: 365, labelKey: "timeRange.1y" },
];

interface Props {
  value: number;
  onChange: (days: number) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("timeRange.label")}
      className="flex w-full items-center gap-0.5 rounded-lg bg-[var(--muted)] p-1 sm:w-auto"
    >
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`min-h-11 min-w-11 flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors sm:flex-none sm:px-2.5 ${active
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          >
            {t(o.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
