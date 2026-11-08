"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { memo, useId, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { HolidaySet } from "@/lib/workdays";
import type { GanttData } from "@/server/projects";
import { useCreateSection, useCreateTask, useDeleteSection, useDeleteTask, useRenameSection, useReorder, useUpdateTask } from "./api";
import type { AvatarUser } from "./avatar";
import { InlineInput } from "./InlineInput";
import { GRID_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, type Row } from "./layout";
import { buildOrder, addRowId } from "./reorder";
import { AddTaskRow, CELL, GRID_COLUMNS, SectionRow, TaskRow } from "./GridRows";
import type { RowMenuItem } from "./RowMenu";

export { GRID_COLUMNS };

export type GridPaneProps = {
  projectId: string;
  /** Needed to build the order body after a drag. */
  data: Pick<GanttData, "sections" | "tasks">;
  rows: readonly Row[];
  collapsed: ReadonlySet<string>;
  /** Number of children per collapsible row id (see childCounts). */
  counts: ReadonlyMap<string, number>;
  usersById: ReadonlyMap<string, AvatarUser>;
  holidaySet: HolidaySet;
  selectedId?: string | null;
  editable?: boolean;
  onToggle: (id: string) => void;
  onSelect?: (taskId: string) => void;
  /** Called after a task or section is deleted so the parent can restore focus. */
  onDeleted?: () => void;
};

type PendingDelete =
  | { kind: "task"; id: string; name: string }
  | { kind: "section"; id: string; name: string; count: number };

export function AddSectionRow({ projectId }: { projectId: string }) {
  const t = useTranslations("gantt");
  const createSection = useCreateSection(projectId);
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex items-center px-2" style={{ height: ROW_HEIGHT }}>
      {adding ? (
        <InlineInput
          keepOpen
          label={t("addSection")}
          placeholder={t("newSectionPlaceholder")}
          onSubmit={(name) => createSection.mutate(name)}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded px-1 py-0.5 text-xs text-muted hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
        >
          + {t("addSection")}
        </button>
      )}
    </div>
  );
}

function GridPaneImpl({
  projectId,
  data,
  rows,
  collapsed,
  counts,
  usersById,
  holidaySet,
  selectedId,
  editable = false,
  onToggle,
  onSelect,
  onDeleted,
}: GridPaneProps) {
  const t = useTranslations("gantt");
  const dndId = useId();
  const reorder = useReorder(projectId);
  const updateTask = useUpdateTask(projectId);
  const createTask = useCreateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const renameSection = useRenameSection(projectId);
  const deleteSection = useDeleteSection(projectId);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(
    () =>
      rows.map((r) =>
        r.kind === "section" ? r.section.id : r.kind === "task" ? r.task.id : addRowId(r.sectionId),
      ),
    [rows],
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const order = buildOrder(data, String(active.id), String(over.id));
    if (order) reorder.mutate(order);
  };

  const addSubtask = (parentId: string) => {
    if (collapsed.has(parentId)) onToggle(parentId);
    createTask.mutate(
      { parentId, name: t("newSubtaskName") },
      { onSuccess: (task) => setRenamingId(task.id) },
    );
  };

  const taskMenu = (id: string, name: string, depth: 0 | 1): RowMenuItem[] => [
    { key: "rename", label: t("menuRename"), onSelect: () => setRenamingId(id) },
    ...(depth === 0
      ? [{ key: "subtask", label: t("menuAddSubtask"), onSelect: () => addSubtask(id) }]
      : []),
    {
      key: "delete",
      label: t("menuDelete"),
      danger: true,
      onSelect: () => setPendingDelete({ kind: "task", id, name }),
    },
  ];

  const sectionMenu = (id: string, name: string, count: number): RowMenuItem[] => [
    { key: "rename", label: t("menuRename"), onSelect: () => setRenamingId(id) },
    {
      key: "delete",
      label: t("deleteSectionTitle"),
      danger: true,
      onSelect: () => setPendingDelete({ kind: "section", id, name, count }),
    },
  ];

  const header = (label: string, width: number, align = "") => (
    <div
      role="columnheader"
      className={`${CELL} ${align} text-xs font-semibold text-muted`}
      style={{ width }}
    >
      {label}
    </div>
  );

  const stopRename = () => setRenamingId(null);
  const renameTask = (id: string, name: string) => updateTask.mutate({ id, patch: { name } });

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

      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {rows.map((row) => {
            if (row.kind === "section") {
              const { section } = row;
              const count = counts.get(section.id) ?? 0;
              return (
                <SectionRow
                  key={`s:${section.id}`}
                  section={section}
                  count={count}
                  open={!collapsed.has(section.id)}
                  editable={editable}
                  renaming={renamingId === section.id}
                  menu={sectionMenu(section.id, section.name, count)}
                  onToggle={onToggle}
                  onStartRename={setRenamingId}
                  onRename={(id, name) => renameSection.mutate({ id, name })}
                  onStopRename={stopRename}
                />
              );
            }
            if (row.kind === "add") {
              return (
                <AddTaskRow
                  key={`a:${row.sectionId}`}
                  sectionId={row.sectionId}
                  adding={addingIn === row.sectionId}
                  onStart={setAddingIn}
                  onCreate={(sectionId, name) => createTask.mutate({ sectionId, name })}
                  onStop={() => setAddingIn(null)}
                />
              );
            }
            const { task, depth } = row;
            const subtasks = depth === 0 ? (counts.get(task.id) ?? 0) : 0;
            return (
              <TaskRow
                key={`t:${task.id}`}
                task={task}
                depth={depth}
                subtasks={subtasks}
                open={!collapsed.has(task.id)}
                selected={selectedId === task.id}
                editable={editable}
                renaming={renamingId === task.id}
                menu={taskMenu(task.id, task.name, depth)}
                holidaySet={holidaySet}
                usersById={usersById}
                onToggle={onToggle}
                onSelect={onSelect}
                onStartRename={setRenamingId}
                onRename={renameTask}
                onStopRename={stopRename}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {editable && <AddSectionRow projectId={projectId} />}

      {pendingDelete && (
        <ConfirmDialog
          title={t(pendingDelete.kind === "task" ? "deleteTaskTitle" : "deleteSectionTitle")}
          body={
            pendingDelete.kind === "task"
              ? t("deleteTaskBody", { name: pendingDelete.name })
              : pendingDelete.count > 0
                ? t("deleteSectionBody", { name: pendingDelete.name, count: pendingDelete.count })
                : t("deleteSectionBodyEmpty", { name: pendingDelete.name })
          }
          confirmLabel={t("menuDelete")}
          onConfirm={async () => {
            if (pendingDelete.kind === "task") await deleteTask.mutateAsync(pendingDelete.id);
            else await deleteSection.mutateAsync(pendingDelete.id);
            onDeleted?.();
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export const GridPane = memo(GridPaneImpl);
