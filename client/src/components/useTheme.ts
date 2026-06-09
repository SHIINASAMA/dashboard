import { createContext, useContext } from "react";
import type { ThemeSettings } from "../lib/themes";

export interface ThemeContextValue {
  settings: ThemeSettings;
  setSettings: (s: ThemeSettings) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
