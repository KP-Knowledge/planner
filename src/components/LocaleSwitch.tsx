"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, type Locale } from "@/i18n/locales";

export function LocaleSwitch() {
  const t = useTranslations("locale");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(locale: Locale) {
    if (locale === current) return;
    const res = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex overflow-hidden rounded-md border border-border text-sm"
    >
      {locales.map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onClick={() => change(value)}
          aria-pressed={current === value}
          className="px-2.5 py-1 text-muted hover:text-text aria-pressed:bg-primary aria-pressed:text-white"
        >
          {t(value)}
        </button>
      ))}
    </div>
  );
}
