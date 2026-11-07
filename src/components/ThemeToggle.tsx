"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

const themes = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex overflow-hidden rounded-md border border-border text-sm"
    >
      {themes.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className="px-2.5 py-1 text-muted hover:text-text aria-pressed:bg-primary aria-pressed:text-white"
        >
          {t(value)}
        </button>
      ))}
    </div>
  );
}
