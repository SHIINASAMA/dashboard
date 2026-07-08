"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { Portal } from "./Portal";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (token: string) => Promise<void>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const label = confirmLabel ?? t("common.delete");
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      void (() => {
        setInput("");
        setLoading(false);
      })();
      api.getConfirmToken().then(({ token }) => setToken(token)).catch(() => setToken("ERROR"));
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const match = input.toLowerCase() === token.toLowerCase();

  const handleConfirm = async () => {
    if (!match || loading) return;
    setLoading(true);
    try {
      await onConfirm(token);
      onOpenChange(false);
    } catch {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
        <div className="relative bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-sm w-full mx-4 shadow-lg" role="dialog" aria-modal="true">
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{description}</p>
          <div className="bg-[var(--muted)] rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest select-all mb-4">
            {token}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder={t("confirm.enterCode")}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
              >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!match || loading}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--danger)] text-white hover:brightness-110 disabled:opacity-40"
            >
              {loading ? "..." : label}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
