import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import { themes, type ThemeCategory } from "../lib/themes";

const MODE_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const MODE_OPTIONS = [
  { value: "system" as const, label: "System" },
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
];

export function Settings() {
  const { settings, setSettings } = useTheme();
  const filtered = (category: ThemeCategory) =>
    themes.filter((t) => t.category === category);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Manage appearance and preferences.</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Appearance</h3>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Mode</p>
            <div className="flex rounded-lg bg-[var(--muted)] p-0.5 gap-0.5">
              {MODE_OPTIONS.map(({ value, label }) => {
                const Icon = MODE_ICONS[value];
                const active = settings.mode === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSettings({ ...settings, mode: value })}
                    className={`flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {(settings.mode === "system" || settings.mode === "light") && (
              <ThemeSelect
                label={settings.mode === "system" ? "Light theme" : "Theme"}
                options={filtered("light")}
                value={settings.lightTheme}
                onChange={(id) => setSettings({ ...settings, lightTheme: id })}
              />
            )}
            {(settings.mode === "system" || settings.mode === "dark") && (
              <ThemeSelect
                label={settings.mode === "system" ? "Dark theme" : "Theme"}
                options={filtered("dark")}
                value={settings.darkTheme}
                onChange={(id) => setSettings({ ...settings, darkTheme: id })}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ThemeSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: typeof themes;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--muted-foreground)] shrink-0 w-24">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      >
        {options.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
