"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { btnGhost, btnGhostDanger, inputCls } from "@/components/buttons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";
import { ColorPicker } from "../teams/ColorPicker";
import { useDeleteTask, useUpdateTask } from "./api";
import { AssigneePicker } from "./AssigneePicker";
import type { TaskPatchInput } from "./optimistic";

const LABEL = "mb-1 block text-xs font-medium text-muted";

export type TaskDetailPanelProps = {
  projectId: string;
  task: Task;
  teams: GanttData["teams"];
  users: GanttData["users"];
  editable: boolean;
  onClose: () => void;
};

function findOrigin(taskId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-task-id="${taskId}"], [data-task-row="${taskId}"]`);
}

export function TaskDetailPanel({ task, onClose, ...rest }: TaskDetailPanelProps) {
  const t = useTranslations("gantt");
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const taskIdRef = useRef(task.id);
  taskIdRef.current = task.id;

  // Remember what opened the panel, then move focus inside. Runs again when another task is selected.
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !panelRef.current?.contains(active)) {
      originRef.current = active;
    }
    panelRef.current?.focus();
  }, [task.id]);

  useEffect(
    () => () => {
      const origin = originRef.current;
      const target =
        origin?.isConnected &&
        (origin.dataset.taskId === taskIdRef.current || origin.dataset.taskRow === taskIdRef.current)
          ? origin
          : findOrigin(taskIdRef.current);
      target?.focus();
    },
    [],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    // Esc inside the delete confirmation closes only that dialog.
    if (e.target instanceof Element && e.target.closest("dialog")) return;
    e.preventDefault();
    const active = document.activeElement;
    // Commit a pending edit (save-on-blur) before the form unmounts.
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) active.blur();
    onClose();
  };

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="flex w-80 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-l border-border bg-card outline-none"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold">
          {t("panelLabel")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("panelClose")}
          className={`${btnGhost} !px-1.5 !py-1`}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
            <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <TaskForm key={task.id} task={task} {...rest} />
    </aside>
  );
}

function TaskForm({
  projectId,
  task,
  teams,
  users,
  editable,
}: Omit<TaskDetailPanelProps, "onClose">) {
  const t = useTranslations("gantt");
  const ids = { name: useId(), desc: useId(), start: useId(), end: useId(), team: useId(), progress: useId() };
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [dates, setDates] = useState<{ start: string; end: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = (patch: TaskPatchInput) => updateTask.mutate({ id: task.id, patch });

  const start = dates?.start ?? task.startDate;
  const end = dates?.end ?? task.endDate;
  const rangeInvalid = !task.isMilestone && start !== "" && end !== "" && end < start;

  const changeDate = (field: "start" | "end", value: string) => {
    const next = { start, end, [field]: value };
    if (task.isMilestone) next.end = next.start;
    if (next.start === "" || next.end === "" || next.end < next.start) {
      setDates(next);
      return;
    }
    setDates(null);
    const patch: TaskPatchInput = {};
    if (next.start !== task.startDate) patch.startDate = next.start;
    if (next.end !== task.endDate) patch.endDate = next.end;
    if (Object.keys(patch).length > 0) save(patch);
  };

  const commitName = () => {
    const trimmed = name.trim();
    setName(trimmed === "" ? task.name : trimmed);
    if (trimmed !== "" && trimmed !== task.name) save({ name: trimmed });
  };

  const commitDescription = () => {
    const next = description.trim() === "" ? null : description;
    if (next !== task.description) save({ description: next });
  };

  const commitProgress = () => {
    if (progress !== null && progress !== task.progress) save({ progress });
    setProgress(null);
  };

  const shownProgress = progress ?? task.progress;

  return (
    <>
      <fieldset disabled={!editable} className="m-0 min-w-0 space-y-4 border-0 p-4">
        <div>
          <label htmlFor={ids.name} className={LABEL}>
            {t("fieldName")}
          </label>
          <input
            id={ids.name}
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor={ids.desc} className={LABEL}>
            {t("fieldDescription")}
          </label>
          <textarea
            id={ids.desc}
            value={description}
            rows={4}
            maxLength={10000}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            className={`${inputCls} resize-y`}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={task.isMilestone}
            onChange={(e) => {
              setDates(null);
              save({ isMilestone: e.target.checked });
            }}
            className="accent-primary"
          />
          {t("fieldMilestone")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids.start} className={LABEL}>
              {t("fieldStart")}
            </label>
            <input
              id={ids.start}
              type="date"
              value={start}
              onChange={(e) => changeDate("start", e.target.value)}
              aria-invalid={rangeInvalid}
              className={inputCls}
            />
          </div>
          {!task.isMilestone && (
            <div>
              <label htmlFor={ids.end} className={LABEL}>
                {t("fieldEnd")}
              </label>
              <input
                id={ids.end}
                type="date"
                value={end}
                onChange={(e) => changeDate("end", e.target.value)}
                aria-invalid={rangeInvalid}
                aria-describedby={rangeInvalid ? `${ids.end}-err` : undefined}
                className={inputCls}
              />
            </div>
          )}
        </div>
        {rangeInvalid && (
          <p id={`${ids.end}-err`} role="alert" className="-mt-2 text-sm text-danger">
            {t("invalidRange")}
          </p>
        )}

        {!task.isMilestone && (
          <div>
            <label htmlFor={ids.progress} className={`${LABEL} flex justify-between`}>
              <span>{t("fieldProgress")}</span>
              <span className="tabular-nums text-text">{shownProgress}%</span>
            </label>
            <input
              id={ids.progress}
              type="range"
              min={0}
              max={100}
              step={1}
              value={shownProgress}
              aria-valuetext={`${shownProgress}%`}
              onChange={(e) => setProgress(Number(e.target.value))}
              onPointerUp={commitProgress}
              onKeyUp={commitProgress}
              onBlur={commitProgress}
              className="w-full accent-primary"
            />
          </div>
        )}

        <div>
          <label htmlFor={ids.team} className={LABEL}>
            {t("fieldTeam")}
          </label>
          <select
            id={ids.team}
            value={task.teamId ?? ""}
            onChange={(e) => save({ teamId: e.target.value || null })}
            className={inputCls}
          >
            <option value="">{t("noTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={LABEL}>{t("fieldColor")}</span>
          <ColorPicker
            label={t("fieldColor")}
            value={task.color ?? ""}
            onChange={(color) => save({ color })}
          />
          <button
            type="button"
            disabled={task.color === null}
            onClick={() => save({ color: null })}
            className={`${btnGhost} mt-2 !px-2 !py-1 text-xs`}
          >
            {t("useTeamColor")}
          </button>
        </div>

        <AssigneePicker
          users={users}
          value={task.assigneeIds}
          onChange={(assigneeIds) => save({ assigneeIds })}
        />
      </fieldset>

      {editable && (
        <div className="mt-auto border-t border-border p-4">
          <button type="button" onClick={() => setConfirmDelete(true)} className={btnGhostDanger}>
            {t("deleteTask")}
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("deleteTaskTitle")}
          body={t("deleteTaskBody", { name: task.name })}
          confirmLabel={t("menuDelete")}
          onConfirm={() => deleteTask.mutateAsync(task.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
