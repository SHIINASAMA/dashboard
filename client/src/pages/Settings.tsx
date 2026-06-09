import { Sun, Moon, Monitor, Key } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../components/useTheme";
import { themes, type ThemeCategory } from "../lib/themes";
import { api } from "../api";
import { useState } from "react";

const MODE_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const MODE_OPTIONS = [
  { value: "system" as const },
  { value: "light" as const },
  { value: "dark" as const },
];

export function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, setSettings } = useTheme();
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    const form = new FormData(e.currentTarget);
    const currentPassword = (form.get("currentPassword") as string) || "";
    const newPassword = (form.get("newPassword") as string) || "";
    const confirm = (form.get("confirmPassword") as string) || "";

    if (newPassword !== confirm) {
      setPwError(t("settings.passwordsDontMatch"));
      return;
    }
    if (newPassword.length < 4) {
      setPwError(t("settings.passwordTooShort"));
      return;
    }

    setPwLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwSuccess(t("settings.passwordChanged"));
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : String(err));
    } finally {
      setPwLoading(false);
    }
  };

  const filtered = (category: ThemeCategory) =>
    themes.filter((theme) => theme.category === category);

  const LANG_OPTIONS = [
    { value: "en" as const, label: "English" },
    { value: "zh" as const, label: "中文" },
  ];

  const MODE_LABELS: Record<string, string> = {
    system: t("settings.modeSystem"),
    light: t("settings.modeLight"),
    dark: t("settings.modeDark"),
  };

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.heading")}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{t("settings.description")}</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">{t("settings.language")}</h3>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex rounded-lg bg-[var(--muted)] p-0.5 gap-0.5">
            {LANG_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => i18n.changeLanguage(value)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  i18n.language === value
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Key size={14} /> {t("settings.security")}</h3>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("settings.currentPassword")}</label>
              <input
                name="currentPassword" type="password" autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("settings.newPassword")}</label>
              <input
                name="newPassword" type="password" autoComplete="new-password"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("settings.confirmPassword")}</label>
              <input
                name="confirmPassword" type="password" autoComplete="new-password"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-sm"
              />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-500">{pwSuccess}</p>}
            <button
              type="submit" disabled={pwLoading}
              className="self-start px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 text-sm"
            >
              {pwLoading ? t("settings.saving") : t("settings.changePassword")}
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">{t("settings.appearance")}</h3>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("settings.mode")}</p>
            <div className="flex rounded-lg bg-[var(--muted)] p-0.5 gap-0.5">
              {MODE_OPTIONS.map(({ value }) => {
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
                    {MODE_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {(settings.mode === "system" || settings.mode === "light") && (
              <ThemeSelect
                label={settings.mode === "system" ? t("settings.lightTheme") : t("settings.theme")}
                options={filtered("light")}
                value={settings.lightTheme}
                onChange={(id) => setSettings({ ...settings, lightTheme: id })}
              />
            )}
            {(settings.mode === "system" || settings.mode === "dark") && (
              <ThemeSelect
                label={settings.mode === "system" ? t("settings.darkTheme") : t("settings.theme")}
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
