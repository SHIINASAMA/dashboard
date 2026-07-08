export interface Theme {
  id: string;
  name: string;
}

export interface ThemeSettings {
  mode: "system" | "light" | "dark";
  lightTheme: string;
  darkTheme: string;
}

export const themes: Theme[] = [
  { id: "default-light", name: "Default Light" },
  { id: "default-dark", name: "Default Dark" },
  { id: "sepia-light", name: "Sepia Light" },
  { id: "sepia-dark", name: "Sepia Dark" },
  { id: "cyber-light", name: "Cyber Light" },
  { id: "cyber-dark", name: "Cyber Dark" },
  { id: "forest-light", name: "Forest Light" },
  { id: "forest-dark", name: "Forest Dark" },
  { id: "sky-light", name: "Sky Light" },
  { id: "sky-dark", name: "Sky Dark" },
  { id: "rose-light", name: "Rose Light" },
  { id: "rose-dark", name: "Rose Dark" },
];

// Themes whose name ends with "-dark" are dark variants.
const isDarkId = (id: string) => id.endsWith("-dark");

export const DEFAULT_SETTINGS: ThemeSettings = {
  mode: "system",
  lightTheme: "default-light",
  darkTheme: "default-dark",
};

const STORAGE_KEY = "theme-settings";

export function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* intentionally empty, return defaults */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: ThemeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveTheme(settings: ThemeSettings): string {
  if (settings.mode === "light") return settings.lightTheme;
  if (settings.mode === "dark") return settings.darkTheme;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? settings.darkTheme : settings.lightTheme;
}

export function applyTheme(themeId: string) {
  const root = document.documentElement;
  root.setAttribute("data-theme", themeId);
  root.classList.toggle("dark", isDarkId(themeId));
}
