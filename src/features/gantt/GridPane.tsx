"use client";

import { useTranslations } from "next-intl";
import { memo } from "react";
import { countWorkdays, type HolidaySet } from "@/lib/workdays";
import { resolveAssignees, type AvatarUser } from "./avatar";
import { HtmlAvatars } from "./Avatars";
import { MEDIUM_DATE, useDateFormat, useTaskLabel } from "./format";
import { GRID_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, type Row } from "./layout";

/** Column widths in px; must add up to GRID_WIDTH. */
export const GRID_COLUMNS = {
  name: 244,
  assignees: 84,
  start: 88,
  end: 88,
  duration: 56,
  progress: 80,
} as const;

const INDENT = 20;
const CELL = "flex shrink-0 items-center overflow-hidden px-2";

export type GridPaneProps = {
  rows: readonly Row[];
  collapsed: ReadonlySet<string>;
  /** Number of children per collapsible row id (see childCounts). */
  counts: ReadonlyMap<string, number>;
  usersById: ReadonlyMap<string, AvatarUser>;
  holidaySet: HolidaySet;
  selectedId?: string | null;
  onToggle: (id: string) => void;
  onSelect?: (taskId: string) => void;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      aria-hidden
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function ToggleButton({
  id,
  name,
  open,
  onToggle,
}: {
  id: string;
  name: string;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("gantt");
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={t(open ? "collapse" : "expand", { name })}
      onClick={() => onToggle(id)}
      className="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Chevron open={open} />
    </button>
  );
}

function GridPaneImpl({
  rows,
  collapsed,
  counts,
  usersById,
  holidaySet,
  selectedId,
  onToggle,
  onSelect,
}: GridPaneProps) {
  const t = useTranslations("gantt");
  const fmt = useDateFormat(MEDIUM_DATE);
  const taskLabel = useTaskLabel();

  const header = (label: string, width: number, align = "") => (
    <div
      role="columnheader"
      className={`${CELL} ${align} text-xs font-semibold text-muted`}
      style={{ width }}
    >
      {label}
    </div>
  );

  return (
    <div
      role="treegrid"
      aria-label={t("gridLabel")}
      aria-rowcount={rows.length + 1}
      className="sticky left-0 z-20 shrink-0 border-r border-border bg-card"
      style={{ width: GRID_WIDTH }}
    >
      <div
        role="row"
        className="sticky top-0 z-10 flex items-center border-b border-border bg-card"
        style={{ height: HEADER_HEIGHT }}
      >
        {header(t("colName"), GRID_COLUMNS.name)}
        {header(t("colAssignees"), GRID_COLUMNS.assignees)}
        {header(t("colStart"), GRID_COLUMNS.start)}
        {header(t("colEnd"), GRID_COLUMNS.end)}
        {header(t("colDuration"), GRID_COLUMNS.duration, "justify-end")}
        {header(t("colProgress"), GRID_COLUMNS.progress, "justify-end")}
      </div>

      {rows.map((row) => {
        if (row.kind === "section") {
          const { section } = row;
          const count = counts.get(section.id) ?? 0;
          const open = !collapsed.has(section.id);
          return (
            <div
              key={`s:${section.id}`}
              role="row"
              tabIndex={0}
              aria-level={1}
              aria-expanded={open}
              aria-label={t("sectionLabel", { name: section.name, count })}
              className="flex items-center border-b border-border bg-surface px-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              style={{ height: ROW_HEIGHT }}
            >
              <ToggleButton id={section.id} name={section.name} open={open} onToggle={onToggle} />
              <span role="gridcell" className="truncate text-sm font-semibold" title={section.name}>
                {section.name}
              </span>
              <span role="gridcell" className="ml-3 shrink-0 text-xs text-muted">
                {t("taskCount", { count })}
              </span>
            </div>
          );
        }

        const { task, depth } = row;
        const subtasks = depth === 0 ? (counts.get(task.id) ?? 0) : 0;
        const open = !collapsed.has(task.id);
        const selected = selectedId === task.id;
        const activate = onSelect ? () => onSelect(task.id) : undefined;
        const duration = task.isMilestone
          ? "–"
          : String(countWorkdays(task.startDate, task.endDate, holidaySet));

        return (
          <div
            key={`t:${task.id}`}
            role="row"
            tabIndex={0}
            aria-level={depth + 2}
            aria-selected={selected}
            aria-expanded={subtasks > 0 ? open : undefined}
            aria-label={taskLabel(task, depth)}
            data-task-row={task.id}
            onClick={activate}
            onKeyDown={(e) => {
              if (activate && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                activate();
              }
            }}
            className={`flex items-center border-b border-border text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              selected ? "bg-primary/10" : "hover:bg-surface"
            }`}
            style={{ height: ROW_HEIGHT }}
          >
            <div
              role="gridcell"
              className={`${CELL} min-w-0`}
              style={{ width: GRID_COLUMNS.name, paddingLeft: 8 + depth * INDENT }}
            >
              {subtasks > 0 ? (
                <ToggleButton id={task.id} name={task.name} open={open} onToggle={onToggle} />
              ) : (
                <span aria-hidden className="mr-1 inline-block w-5 shrink-0" />
              )}
              <span className={`truncate ${depth > 0 ? "text-muted" : ""}`} title={task.name}>
                {task.name}
              </span>
            </div>
            <div role="gridcell" className={CELL} style={{ width: GRID_COLUMNS.assignees }}>
              <HtmlAvatars users={resolveAssignees(task.assigneeIds, usersById)} />
            </div>
            <div role="gridcell" className={`${CELL} text-xs`} style={{ width: GRID_COLUMNS.start }}>
              {fmt(task.startDate)}
            </div>
            <div role="gridcell" className={`${CELL} text-xs`} style={{ width: GRID_COLUMNS.end }}>
              {task.isMilestone ? "–" : fmt(task.endDate)}
            </div>
            <div
              role="gridcell"
              className={`${CELL} justify-end text-xs tabular-nums`}
              style={{ width: GRID_COLUMNS.duration }}
            >
              {duration}
            </div>
            <div
              role="gridcell"
              className={`${CELL} justify-end text-xs tabular-nums`}
              style={{ width: GRID_COLUMNS.progress }}
            >
              {task.isMilestone ? "–" : `${task.progress}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const GridPane = memo(GridPaneImpl);
