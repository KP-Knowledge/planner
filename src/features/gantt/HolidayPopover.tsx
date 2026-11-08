"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { HttpError } from "@/lib/api-client";
import { btnGhostDanger, btnPrimary, inputCls } from "@/components/buttons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { ISODate } from "@/lib/dates";
import type { Holiday } from "@/server/projects";
import { useCreateHoliday, useDeleteHoliday, useUpdateHoliday } from "../holidays/api";
import { utcDate } from "./format";

const WIDTH = 320;
const MARGIN = 8;

type Scope = "org" | "project";

function useErrorText() {
  const t = useTranslations("holidays");
  return (err: unknown) => (err instanceof HttpError && err.code === "duplicate" ? t("duplicate") : t("saveFailed"));
}

export function ScopeBadge({ projectId }: { projectId: string | null }) {
  const t = useTranslations("holidays");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden
        className={`size-2 rounded-full ${projectId === null ? "bg-primary" : "bg-accent"}`}
      />
      {projectId === null ? t("scopeOrg") : t("scopeProject")}
    </span>
  );
}

function HolidayRow({
  holiday,
  projectId,
  editable,
}: {
  holiday: Holiday;
  projectId: string;
  editable: boolean;
}) {
  const t = useTranslations("holidays");
  const update = useUpdateHoliday(projectId);
  const remove = useDeleteHoliday(projectId);
  const errorText = useErrorText();
  const [draft, setDraft] = useState(holiday.name);
  const [seen, setSeen] = useState(holiday.name);
  const [confirming, setConfirming] = useState(false);
  if (seen !== holiday.name) {
    setSeen(holiday.name);
    setDraft(holiday.name);
  }
  const trimmed = draft.trim();
  const dirty = trimmed !== "" && trimmed !== holiday.name;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (dirty && !update.isPending) update.mutate({ id: holiday.id, patch: { name: trimmed } });
  };

  return (
    <li className="space-y-1.5">
      <ScopeBadge projectId={holiday.projectId} />
      {editable ? (
        <form onSubmit={save} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            aria-label={t("rename", { name: holiday.name })}
            className={inputCls}
          />
          {dirty && (
            <button type="submit" disabled={update.isPending} className={btnPrimary}>
              {t("saveName")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t("removeNamed", { name: holiday.name })}
            className={btnGhostDanger}
          >
            {t("remove")}
          </button>
        </form>
      ) : (
        <p className="text-sm">{holiday.name}</p>
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorText(update.error)}
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          title={t("removeTitle")}
          body={t("removeBody", { name: holiday.name })}
          confirmLabel={t("remove")}
          onConfirm={() => remove.mutateAsync(holiday.id)}
          onClose={() => setConfirming(false)}
        />
      )}
    </li>
  );
}

/** Edit UI for one date: every holiday on it (org and project can coexist) plus the "Mark as holiday" form. */
export function HolidayDayEditor({
  projectId,
  date,
  holidays,
  editable,
}: {
  projectId: string;
  date: ISODate;
  holidays: readonly Holiday[];
  editable: boolean;
}) {
  const t = useTranslations("holidays");
  const format = useFormatter();
  const create = useCreateHoliday(projectId);
  const errorText = useErrorText();
  const radioName = useId();
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<Scope>("org");

  const hasOrg = holidays.some((h) => h.projectId === null);
  const hasProject = holidays.some((h) => h.projectId !== null);
  const taken = (s: Scope) => (s === "org" ? hasOrg : hasProject);
  const scope: Scope = taken(chosen) ? (chosen === "org" ? "project" : "org") : chosen;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || create.isPending) return;
    create.mutate(
      { date, name: trimmed, projectId: scope === "project" ? projectId : undefined },
      { onSuccess: () => setName("") },
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        {format.dateTime(utcDate(date), { dateStyle: "full", timeZone: "UTC" })}
      </h3>
      {holidays.length > 0 ? (
        <ul className="space-y-3">
          {holidays.map((h) => (
            <HolidayRow key={h.id} holiday={h} projectId={projectId} editable={editable} />
          ))}
        </ul>
      ) : (
        !editable && <p className="text-sm text-muted">{t("none")}</p>
      )}
      {editable ? (
        !(hasOrg && hasProject) && (
          <form onSubmit={submit} className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">{t("mark")}</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
              placeholder={t("fieldName")}
              aria-label={t("fieldName")}
              className={inputCls}
            />
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <legend className="sr-only">{t("fieldScope")}</legend>
              {(["org", "project"] as const).map((s) => (
                <label key={s} className="inline-flex items-center gap-1.5 aria-disabled:opacity-50" aria-disabled={taken(s)}>
                  <input
                    type="radio"
                    name={radioName}
                    value={s}
                    checked={scope === s}
                    disabled={taken(s)}
                    onChange={() => setChosen(s)}
                    className="accent-primary"
                  />
                  {s === "org" ? t("scopeOrg") : t("scopeProject")}
                </label>
              ))}
            </fieldset>
            {create.isError && (
              <p role="alert" className="text-sm text-danger">
                {errorText(create.error)}
              </p>
            )}
            <button type="submit" disabled={create.isPending || name.trim() === ""} className={btnPrimary}>
              {t("add")}
            </button>
          </form>
        )
      ) : (
        <p className="text-xs text-muted">{t("readOnly")}</p>
      )}
    </div>
  );
}

function place(anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const top = r.bottom + 4;
  return {
    top,
    left: Math.max(MARGIN, Math.min(r.left, window.innerWidth - WIDTH - MARGIN)),
    maxHeight: Math.max(160, window.innerHeight - top - MARGIN),
  };
}

/**
 * Anchored under a header cell with `position: fixed`, so it must render outside the scroll container (the
 * header is sticky inside it). Scrolling or resizing closes it because the anchor moves.
 */
export function HolidayPopover({
  anchor,
  date,
  holidays,
  projectId,
  editable,
  onClose,
}: {
  anchor: HTMLElement;
  date: ISODate;
  holidays: readonly Holiday[];
  projectId: string;
  editable: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("holidays");
  const format = useFormatter();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [pos] = useState(() => place(anchor));
  const count = holidays.length;

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el.querySelector<HTMLElement>("input") ?? el).focus({ preventScroll: true });

    const inDialog = (n: EventTarget | null) => n instanceof Element && n.closest("dialog") !== null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || inDialog(e.target)) return;
      e.preventDefault();
      closeRef.current();
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
    const onDown = (e: PointerEvent) => {
      const n = e.target;
      if (!(n instanceof Node) || el.contains(n) || anchor.contains(n) || inDialog(n)) return;
      closeRef.current();
    };
    const onMove = (e: Event) => {
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [anchor]);

  // Removing a holiday unmounts the button that had focus; keep focus inside the popover.
  useEffect(() => {
    const el = ref.current;
    const active = document.activeElement;
    if (!el || el.contains(active) || (active instanceof Element && active.closest("dialog"))) return;
    el.focus({ preventScroll: true });
  }, [count]);

  return (
    <div
      ref={ref}
      role="dialog"
      tabIndex={-1}
      aria-label={t("dayLabel", {
        date: format.dateTime(utcDate(date), { dateStyle: "medium", timeZone: "UTC" }),
      })}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: WIDTH, maxHeight: pos.maxHeight }}
      className="z-30 max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border border-border bg-card p-4 text-text shadow-xl outline-none"
    >
      <HolidayDayEditor projectId={projectId} date={date} holidays={holidays} editable={editable} />
    </div>
  );
}
