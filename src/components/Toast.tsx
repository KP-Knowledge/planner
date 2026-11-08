"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };
export type ShowToast = (message: string, tone?: ToastTone) => void;

const DISMISS_MS = 5000;
const ToastContext = createContext<ShowToast | null>(null);

/** `const toast = useToast(); toast("Saved")` or `toast("Failed", "error")`. */
export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (message, tone = "info") => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-md border bg-card px-3 py-2 text-sm shadow-lg ${
              item.tone === "error" ? "border-danger text-danger" : "border-border text-text"
            }`}
          >
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t("dismiss")}
              className="shrink-0 rounded-sm text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
