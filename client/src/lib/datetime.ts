const STORAGE_KEY = "timezone";

export function getTimezone(): string {
  return localStorage.getItem(STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function setTimezone(tz: string) {
  localStorage.setItem(STORAGE_KEY, tz);
}

export function formatDate(date: Date | string, timeZone?: string): string {
  return new Date(date).toLocaleDateString(undefined, { timeZone: timeZone || getTimezone() });
}

export function formatDateTime(date: Date | string, timeZone?: string): string {
  return new Date(date).toLocaleString(undefined, { timeZone: timeZone || getTimezone() });
}
