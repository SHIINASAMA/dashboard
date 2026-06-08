import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadSettings, saveSettings, resolveTheme, applyTheme, type ThemeSettings } from "../lib/themes";

interface ThemeContextValue {
  settings: ThemeSettings;
  setSettings: (s: ThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
