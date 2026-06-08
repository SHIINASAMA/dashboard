export type ThemeCategory = "light" | "dark";

export interface Theme {
  id: string;
  name: string;
  category: ThemeCategory;
}

export interface ThemeSettings {
  mode: "system" | "light" | "dark";
  lightTheme: string;
  darkTheme: string;
}

export const themes: Theme[] = [
  { id: "default-light", name: "Default Light", category: "light" },
  { id: "default-dark", name: "Default Dark", category: "dark" },
];

export const darkThemeIds = new Set(
  themes.filter((t) => t.category === "dark").map((t) => t.id),
);

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
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: ThemeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveTheme(settings: ThemeSettings): string {
  if (settings.mode === "light") return settings.lightTheme;
  if (settings.mode === "dark") return settings.darkTheme;
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  return prefersDark ? settings.darkTheme : settings.lightTheme;
}

export function applyTheme(themeId: string) {
  const root = document.documentElement;
  root.setAttribute("data-theme", themeId);
  root.classList.toggle("dark", darkThemeIds.has(themeId));
}
