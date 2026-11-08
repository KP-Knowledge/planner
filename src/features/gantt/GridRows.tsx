"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import type { CSSProperties, MouseEvent } from "react";
import { countWorkdays, type HolidaySet } from "@/lib/workdays";
import type { Section } from "@/server/sections";
import type { Task } from "@/server/tasks";
import { resolveAssignees, type AvatarUser } from "./avatar";
import { HtmlAvatars } from "./Avatars";
import { useTaskFormat } from "./format";
import { InlineInput } from "./InlineInput";
import { ROW_HEIGHT } from "./layout";
import { addRowId } from "./reorder";
import { RowMenu, type RowMenuItem } from "./RowMenu";

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
export const CELL = "flex shrink-0 items-center overflow-hidden px-2";
const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
const SMALL_BTN =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-primary";

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
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onToggle(id);
      }}
      className={`mr-1 ${SMALL_BTN}`}
    >
      <Chevron open={open} />
    </button>
  );
}

function translate(t: { x: number; y: number } | null): string | undefined {
  return t ? `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)` : undefined;
}

function rowStyle(
  transform: { x: number; y: number } | null,
  transition: string | undefined,
  isDragging: boolean,
): CSSProperties {
  return {
    height: ROW_HEIGHT,
    transform: translate(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 30 } : null),
  };
}

function DragHandle({
  name,
  setActivatorNodeRef,
  attributes,
  listeners,
}: {
  name: string;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  attributes: object;
  listeners: object | undefined;
}) {
  const t = useTranslations("gantt");
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t("reorder", { name })}
      onClick={(e) => e.stopPropagation()}
      className={`mr-0.5 w-4 cursor-grab touch-none ${SMALL_BTN} active:cursor-grabbing`}
    >
      <svg width={10} height={14} viewBox="0 0 10 14" aria-hidden fill="currentColor">
        <circle cx={2.5} cy={3} r={1.1} />
        <circle cx={7.5} cy={3} r={1.1} />
        <circle cx={2.5} cy={7} r={1.1} />
        <circle cx={7.5} cy={7} r={1.1} />
        <circle cx={2.5} cy={11} r={1.1} />
        <circle cx={7.5} cy={11} r={1.1} />
      </svg>
    </button>
  );
}

/** Returns focus to the row after a keyboard-closed editor. */
const refocus = (id: string) => (reason: "key" | "blur") => {
  if (reason !== "key") return;
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`[data-task-row="${id}"], [data-section-row="${id}"]`)?.focus(),
  );
};

export function SectionRow({
  section,
  count,
  open,
  editable,
  renaming,
  menu,
  onToggle,
  onStartRename,
  onRename,
  onStopRename,
}: {
  section: Section;
  count: number;
  open: boolean;
  editable: boolean;
  renaming: boolean;
  menu: readonly RowMenuItem[];
  onToggle: (id: string) => void;
  onStartRename: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStopRename: () => void;
}) {
  const t = useTranslations("gantt");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, disabled: { draggable: !editable } });
  return (
    <div
      ref={setNodeRef}
      style={rowStyle(transform, transition, isDragging)}
      role="row"
      tabIndex={0}
      aria-level={1}
      aria-expanded={open}
      aria-label={t("sectionLabel", { name: section.name, count })}
      data-section-row={section.id}
      className={`flex items-center border-b border-border bg-surface px-1 ${FOCUS} ${
        isDragging ? "shadow-md" : ""
      }`}
    >
      {editable && (
        <DragHandle
          name={section.name}
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
      )}
      <ToggleButton id={section.id} name={section.name} open={open} onToggle={onToggle} />
      {renaming ? (
        <div role="gridcell" className="min-w-0 flex-1 pr-2">
          <InlineInput
            initial={section.name}
            label={t("fieldName")}
            onSubmit={(name) => onRename(section.id, name)}
            onClose={(reason) => {
              onStopRename();
              refocus(section.id)(reason);
            }}
          />
        </div>
      ) : (
        <>
          <span
            role="gridcell"
            className="truncate text-sm font-semibold"
            title={section.name}
            onDoubleClick={editable ? () => onStartRename(section.id) : undefined}
          >
            {section.name}
          </span>
          <span role="gridcell" className="ml-3 shrink-0 text-xs text-muted">
            {t("taskCount", { count })}
          </span>
        </>
      )}
      {editable && !renaming && (
        <span className="ml-auto shrink-0">
          <RowMenu name={section.name} items={menu} />
        </span>
      )}
    </div>
  );
}

export function TaskRow({
  task,
  depth,
  subtasks,
  open,
  selected,
  editable,
  renaming,
  menu,
  holidaySet,
  usersById,
  onToggle,
  onSelect,
  onStartRename,
  onRename,
  onStopRename,
}: {
  task: Task;
  depth: 0 | 1;
  subtasks: number;
  open: boolean;
  selected: boolean;
  editable: boolean;
  renaming: boolean;
  menu: readonly RowMenuItem[];
  holidaySet: HolidaySet;
  usersById: ReadonlyMap<string, AvatarUser>;
  onToggle: (id: string) => void;
  onSelect?: (taskId: string) => void;
  onStartRename: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStopRename: () => void;
}) {
  const t = useTranslations("gantt");
  const { date: fmt, taskLabel } = useTaskFormat();
  // Subtasks follow their parent, so only top-level rows can be dragged.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: { draggable: !(editable && depth === 0) } });
  const activate = onSelect ? () => onSelect(task.id) : undefined;
  const duration = task.isMilestone ? "–" : String(countWorkdays(task.startDate, task.endDate, holidaySet));

  return (
    <div
      ref={setNodeRef}
      style={rowStyle(transform, transition, isDragging)}
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
      className={`flex items-center border-b border-border text-sm ${FOCUS} ${
        isDragging ? "bg-card shadow-md" : selected ? "bg-primary/10" : "hover:bg-surface"
      }`}
    >
      <div
        role="gridcell"
        className={`${CELL} min-w-0`}
        style={{ width: GRID_COLUMNS.name, paddingLeft: 4 + depth * INDENT }}
      >
        {editable && depth === 0 ? (
          <DragHandle
            name={task.name}
            setActivatorNodeRef={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
          />
        ) : (
          <span aria-hidden className="inline-block w-4 shrink-0" />
        )}
        {subtasks > 0 ? (
          <ToggleButton id={task.id} name={task.name} open={open} onToggle={onToggle} />
        ) : (
          <span aria-hidden className="mr-1 inline-block w-5 shrink-0" />
        )}
        {renaming ? (
          <InlineInput
            initial={task.name}
            label={t("fieldName")}
            onSubmit={(name) => onRename(task.id, name)}
            onClose={(reason) => {
              onStopRename();
              refocus(task.id)(reason);
            }}
          />
        ) : (
          <span
            className={`min-w-0 flex-1 truncate ${depth > 0 ? "text-muted" : ""}`}
            title={task.name}
            onDoubleClick={editable ? () => onStartRename(task.id) : undefined}
          >
            {task.name}
          </span>
        )}
        {editable && !renaming && <RowMenu name={task.name} items={menu} />}
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
}

/** "Add task" row closing a section. Also a drop target for "move to the end of this section". */
export function AddTaskRow({
  sectionId,
  adding,
  onStart,
  onCreate,
  onStop,
}: {
  sectionId: string;
  adding: boolean;
  onStart: (sectionId: string) => void;
  onCreate: (sectionId: string, name: string) => void;
  onStop: () => void;
}) {
  const t = useTranslations("gantt");
  const { setNodeRef, transform, transition } = useSortable({
    id: addRowId(sectionId),
    disabled: { draggable: true },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ ...rowStyle(transform, transition, false), paddingLeft: 4 + 16 + 24 }}
      role="row"
      className="flex items-center border-b border-border pr-2"
    >
      <div role="gridcell" className="min-w-0 flex-1">
        {adding ? (
          <InlineInput
            keepOpen
            label={t("addTask")}
            placeholder={t("newTaskPlaceholder")}
            onSubmit={(name) => onCreate(sectionId, name)}
            onClose={onStop}
          />
        ) : (
          <button
            type="button"
            onClick={() => onStart(sectionId)}
            className="rounded px-1 py-0.5 text-xs text-muted hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
          >
            + {t("addTask")}
          </button>
        )}
      </div>
    </div>
  );
}
