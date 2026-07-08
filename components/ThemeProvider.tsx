"use client";

import { useEffect, useState, type ReactNode } from "react";
import { loadSettings, saveSettings, resolveTheme, applyTheme } from "@/lib/client/themes";
import type { ThemeSettings } from "@/lib/client/themes";
import { ThemeContext } from "./useTheme";

function matchSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<ThemeSettings>(loadSettings);

  const setSettings = (s: ThemeSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };

  useEffect(() => {
    const mq = matchSystemDark();
    const handler = () => {
      if (settings.mode === "system") {
        applyTheme(resolveTheme(settings));
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings]);

  useEffect(() => {
    applyTheme(resolveTheme(settings));
  }, [settings]);

  return (
    <ThemeContext.Provider value={{ settings, setSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}
