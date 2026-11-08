"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/buttons";
import type { ISODate } from "@/lib/dates";
import type { Holiday } from "@/server/projects";
import { useHolidays, useImportHolidays } from "../holidays/api";
import { MonthGrid } from "../holidays/MonthGrid";
import { utcDate } from "./format";
import { HolidayDayEditor, ScopeBadge } from "./HolidayPopover";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const NO_BUDDHIST_FROM = 2027;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function HolidayDrawer({
  projectId,
  initialYear,
  editable,
  onClose,
}: {
  projectId: string;
  initialYear: number;
  editable: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("holidays");
  const tc = useTranslations("common");
  const format = useFormatter();
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [year, setYear] = useState(initialYear);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const { data, isPending, isError, refetch } = useHolidays(year, projectId);
  const importHolidays = useImportHolidays(projectId);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<ISODate, Holiday[]>();
    for (const h of data ?? []) {
      const list = map.get(h.date);
      if (list) list.push(h);
      else map.set(h.date, [h]);
    }
    return map;
  }, [data]);

  const goTo = (next: number) => {
    setYear(next);
    setSelected(null);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-3xl border-l border-border bg-card p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {t("title")}
          </h2>
          <div role="group" aria-label={t("year")} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(year - 1)}
              disabled={year <= MIN_YEAR}
              aria-label={t("prevYear")}
              className={btnSecondary}
            >
              ‹
            </button>
            <span className="min-w-14 text-center text-sm font-medium tabular-nums" aria-live="polite">
              {year}
            </span>
            <button
              type="button"
              onClick={() => goTo(year + 1)}
              disabled={year >= MAX_YEAR}
              aria-label={t("nextYear")}
              className={btnSecondary}
            >
              ›
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => importHolidays.mutate(year)}
                disabled={importHolidays.isPending}
                className={btnPrimary}
              >
                {importHolidays.isPending ? t("importing") : t("importYear", { year })}
              </button>
            )}
            <button type="button" onClick={onClose} className={btnSecondary}>
              {t("close")}
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!editable && <p className="text-sm text-muted">{t("readOnly")}</p>}
          <p role="status" className="text-sm text-muted empty:hidden">
            {importHolidays.isSuccess && importHolidays.variables === year
              ? t("imported", { count: importHolidays.data.inserted })
              : null}
            {importHolidays.isError ? t("importFailed") : null}
          </p>
          {year >= NO_BUDDHIST_FROM && (
            <p role="note" className="rounded-md border border-warning bg-surface px-3 py-2 text-sm">
              {t("banner")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <ScopeBadge projectId={null} />
            <ScopeBadge projectId={projectId} />
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: "linear-gradient(135deg, var(--color-primary) 50%, var(--color-accent) 50%)" }}
              />
              {t("legendBoth")}
            </span>
          </div>

          {isPending ? (
            <p className="text-sm text-muted">{tc("loading")}</p>
          ) : isError ? (
            <div>
              <p role="alert" className="text-sm text-danger">
                {tc("error")}
              </p>
              <button type="button" onClick={() => refetch()} className={`${btnSecondary} mt-2`}>
                {tc("retry")}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                {MONTHS.map((m) => (
                  <MonthGrid
                    key={m}
                    year={year}
                    month={m}
                    holidaysByDate={byDate}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ))}
              </div>

              <div className="rounded-lg border border-border p-4">
                {selected ? (
                  <HolidayDayEditor
                    key={selected}
                    projectId={projectId}
                    date={selected}
                    holidays={byDate.get(selected) ?? []}
                    editable={editable}
                  />
                ) : (
                  <p className="text-sm text-muted">{t("hint")}</p>
                )}
              </div>

              <section aria-label={t("listTitle", { year })}>
                <h3 className="mb-2 text-sm font-semibold">{t("listTitle", { year })}</h3>
                {data.length === 0 ? (
                  <p className="text-sm text-muted">{t("listEmpty", { year })}</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {data.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(h.date)}
                          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="w-28 shrink-0 tabular-nums text-muted">
                            {format.dateTime(utcDate(h.date), { dateStyle: "medium", timeZone: "UTC" })}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{h.name}</span>
                          <ScopeBadge projectId={h.projectId} />
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                            {h.source === "seed" ? t("sourceSeed") : t("sourceCustom")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
