import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en.json";
import zh from "../locales/zh.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18n-lang",
    },
  });

if (import.meta.env.DEV) {
  i18n.on("missingKey", (_lngs, _ns, key) => {
    console.warn(`[i18n] Missing key "${key}"`);
  });
}

export function formatDate(date: Date | string): string {
  const lang = i18n.language;
  return new Date(date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US");
}

export function formatDateTime(date: Date | string): string {
  const lang = i18n.language;
  return new Date(date).toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
}

export default i18n;
