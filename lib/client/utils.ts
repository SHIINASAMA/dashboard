import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { prepareWithSegments, measureNaturalWidth } from "@chenglou/pretext";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TICK_FONT = "10px system-ui";
const PADDING = 12;

export function calcYAxisWidth(data: Record<string, unknown>[], ...keys: string[]) {
  if (!data.length || !keys.length) return 30;
  const max = Math.max(...data.map(d => Math.max(...keys.map(k => Number(d[k] ?? 0)))));
  const formatted = max.toLocaleString();
  const prepared = prepareWithSegments(formatted, TICK_FONT);
  const textWidth = measureNaturalWidth(prepared);
  return Math.max(30, Math.ceil(textWidth) + PADDING);
}
