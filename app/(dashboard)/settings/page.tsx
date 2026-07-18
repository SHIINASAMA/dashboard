"use client";

import { Sun, Moon, Monitor, Key, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/useTheme";
import { themes, type Theme } from "@/lib/client/themes";
import { api } from "@/lib/api";
import { getTimezone, setTimezone } from "@/lib/client/datetime";
import { useState } from "react";
import { validatePassword } from "@/lib/client/validatePassword";
import { PasswordHints } from "@/components/ui/PasswordHints";

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

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, setSettings } = useTheme();
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const pwRules = validatePassword(newPw).rules;
  const pwMismatch = confirmPw !== "" && newPw !== confirmPw;

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = (form.get("currentPassword") as string) || "";
    const newPassword = (form.get("newPassword") as string) || "";
    const confirm = (form.get("confirmPassword") as string) || "";

    if (newPassword !== confirm) {
      setPwError(t("settings.passwordsDontMatch"));
      return;
    }
    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) {
      setPwError(t(`settings.password${pwResult.errorKey}`));
      return;
    }

    setPwLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwSuccess(t("settings.passwordChanged"));
      formElement.reset();
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : String(err));
    } finally {
      setPwLoading(false);
    }
  };

  const allThemes = themes;

  const LANG_OPTIONS = [
    { value: "en" as const, label: "English" },
    { value: "zh" as const, label: "中文" },
  ];

  const MODE_LABELS: Record<string, string> = {
    system: t("settings.modeSystem"),
    light: t("settings.modeLight"),
    dark: t("settings.modeDark"),
  };

  const tz = getTimezone();
  const COMMON_TIMEZONES = [
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Taipei",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "America/Buenos_Aires",
    "America/Sao_Paulo",
    "America/Mexico_City",
    "Pacific/Auckland",
    "Australia/Sydney",
    "UTC",
  ];

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
                className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Clock size={14} /> {t("settings.timezone")}</h3>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <select
            value={tz}
            onChange={(e) => setTimezone(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {COMMON_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">{t("settings.timezoneHint")}</p>
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
                className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("settings.newPassword")}</label>
              <input
                name="newPassword" type="password" autoComplete="new-password"
                value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwError(""); }}
                className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              {newPw && <div className="mt-2"><PasswordHints rules={pwRules} t={t} namespace="settings" /></div>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{t("settings.confirmPassword")}</label>
              <input
                name="confirmPassword" type="password" autoComplete="new-password"
                value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setPwError(""); }}
                className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              {pwMismatch && <p className="text-xs text-[var(--danger)] mt-1">{t("settings.passwordsDontMatch")}</p>}
            </div>
            {pwError && <p className="text-xs text-[var(--danger)]">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-[var(--success)]">{pwSuccess}</p>}
            <button
              type="submit" disabled={pwLoading}
              className="min-h-11 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:self-start"
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
                    className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
            <div className="space-y-3">
              {(settings.mode === "system" || settings.mode === "light") && (
                <ThemeSelect
                  label={settings.mode === "system" ? t("settings.lightTheme") : t("settings.theme")}
                  options={allThemes}
                  value={settings.lightTheme}
                  onChange={(id) => setSettings({ ...settings, lightTheme: id })}
                />
              )}
              {(settings.mode === "system" || settings.mode === "dark") && (
                <ThemeSelect
                  label={settings.mode === "system" ? t("settings.darkTheme") : t("settings.theme")}
                  options={allThemes}
                  value={settings.darkTheme}
                  onChange={(id) => setSettings({ ...settings, darkTheme: id })}
                />
              )}
            </div>
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
  options: Theme[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm text-[var(--muted-foreground)] sm:w-24 sm:shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      >
        {options.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
