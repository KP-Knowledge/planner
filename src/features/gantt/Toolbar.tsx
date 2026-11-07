import { useTranslations } from "next-intl";
import Link from "next/link";
import { btnSecondary } from "@/components/buttons";
import type { Zoom } from "./layout";

const ZOOMS: Zoom[] = ["day", "week", "month"];

export function Toolbar({
  name,
  archived,
  zoom,
  onZoom,
  onToday,
}: {
  name: string;
  archived: boolean;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  onToday: () => void;
}) {
  const t = useTranslations("gantt");
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
      <Link
        href="/"
        className="rounded-sm text-sm text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← {t("back")}
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
        {name}
        {archived && (
          <span className="ml-2 rounded-full border border-border px-2 py-0.5 align-middle text-xs font-normal text-muted">
            {t("archived")}
          </span>
        )}
      </h1>
      <button type="button" onClick={onToday} className={btnSecondary}>
        {t("today")}
      </button>
      <div role="group" aria-label={t("zoom")} className="inline-flex overflow-hidden rounded-md border border-border">
        {ZOOMS.map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={zoom === z}
            onClick={() => onZoom(z)}
            className="px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary aria-pressed:bg-primary aria-pressed:text-white"
          >
            {t(z)}
          </button>
        ))}
      </div>
    </div>
  );
}
