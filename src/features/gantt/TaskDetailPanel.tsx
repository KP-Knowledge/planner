"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { btnGhostDanger, btnGhost, btnPrimary, btnSecondary, inputCls } from "@/components/buttons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";
import { ColorPicker } from "../teams/ColorPicker";
import { useDeleteTask, useUpdateTask } from "./api";
import { AssigneePicker } from "./AssigneePicker";
import { DATE_MAX, DATE_MIN } from "./dateInput";
import { draftToPatch, initialDraft, isDirty, validateDraft, type TaskDraft } from "./taskDraft";

const LABEL = "mb-1 block text-xs font-medium text-muted";

export type TaskDetailPanelProps = {
  projectId: string;
  task: Task;
  teams: GanttData["teams"];
  users: GanttData["users"];
  editable: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

export function TaskDetailPanel({
  projectId,
  task,
  teams,
  users,
  editable,
  onClose,
  onDeleted,
}: TaskDetailPanelProps) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");
  const ids = { name: useId(), desc: useId(), start: useId(), end: useId(), team: useId(), progress: useId() };
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [draft, setDraft] = useState<TaskDraft>(() => initialDraft(task));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const validation = validateDraft(draft);
  const dirty = editable && isDirty(task, draft);
  const nameError = !validation.ok && validation.name === "empty";
  const dateError = !validation.ok ? validation.dates : null;
  const dateMessage =
    dateError === "year" ? t("invalidYear") : dateError === "range" ? t("invalidRange") : dateError === "incomplete" ? t("invalidDate") : null;

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!editable || !validation.ok) return;
    const patch = draftToPatch(task, draft);
    if (Object.keys(patch).length > 0) updateTask.mutate({ id: task.id, patch });
    onClose();
  };

  const dateErrId = `${ids.end}-err`;

  return (
    <>
      <Modal title={t("panelLabel")} onClose={onClose} onDismiss={requestClose} size="lg">
        <form onSubmit={submit} noValidate className="mt-4">
          <fieldset
            disabled={!editable}
            className="m-0 max-h-[calc(100dvh-16rem)] min-w-0 space-y-4 overflow-y-auto border-0 p-1"
          >
            <div>
              <label htmlFor={ids.name} className={LABEL}>
                {t("fieldName")}
              </label>
              <input
                id={ids.name}
                value={draft.name}
                maxLength={200}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={nameError}
                aria-describedby={nameError ? `${ids.name}-err` : undefined}
                className={inputCls}
              />
              {nameError && (
                <p id={`${ids.name}-err`} role="alert" className="mt-1 text-sm text-danger">
                  {t("emptyName")}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={ids.desc} className={LABEL}>
                {t("fieldDescription")}
              </label>
              <textarea
                id={ids.desc}
                value={draft.description}
                rows={4}
                maxLength={10000}
                onChange={(e) => set("description", e.target.value)}
                className={`${inputCls} resize-y`}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isMilestone}
                onChange={(e) => set("isMilestone", e.target.checked)}
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
                  value={draft.startDate}
                  min={DATE_MIN}
                  max={DATE_MAX}
                  onChange={(e) => set("startDate", e.target.value)}
                  aria-invalid={dateError !== null}
                  aria-describedby={dateError ? dateErrId : undefined}
                  className={inputCls}
                />
              </div>
              {!draft.isMilestone && (
                <div>
                  <label htmlFor={ids.end} className={LABEL}>
                    {t("fieldEnd")}
                  </label>
                  <input
                    id={ids.end}
                    type="date"
                    value={draft.endDate}
                    min={DATE_MIN}
                    max={DATE_MAX}
                    onChange={(e) => set("endDate", e.target.value)}
                    aria-invalid={dateError !== null}
                    aria-describedby={dateError ? dateErrId : undefined}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
            {dateMessage && (
              <p id={dateErrId} role="alert" className="-mt-2 text-sm text-danger">
                {dateMessage}
              </p>
            )}

            {!draft.isMilestone && (
              <div>
                <label htmlFor={ids.progress} className={`${LABEL} flex justify-between`}>
                  <span>{t("fieldProgress")}</span>
                  <span className="tabular-nums text-text">{draft.progress}%</span>
                </label>
                <input
                  id={ids.progress}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.progress}
                  aria-valuetext={`${draft.progress}%`}
                  onChange={(e) => set("progress", Number(e.target.value))}
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
                value={draft.teamId}
                onChange={(e) => set("teamId", e.target.value)}
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
                value={draft.color ?? ""}
                onChange={(color) => set("color", color)}
              />
              <button
                type="button"
                disabled={draft.color === null}
                onClick={() => set("color", null)}
                className={`${btnGhost} mt-2 !px-2 !py-1 text-xs`}
              >
                {t("useTeamColor")}
              </button>
            </div>

            <AssigneePicker
              users={users}
              value={draft.assigneeIds}
              onChange={(assigneeIds) => set("assigneeIds", assigneeIds)}
            />
          </fieldset>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            {editable ? (
              <>
                <button type="button" onClick={() => setConfirmDelete(true)} className={btnGhostDanger}>
                  {t("deleteTask")}
                </button>
                <span className="flex-1" />
                <button type="button" onClick={requestClose} className={btnSecondary}>
                  {tc("cancel")}
                </button>
                <button type="submit" disabled={!validation.ok || !dirty} className={btnPrimary}>
                  {tc("save")}
                </button>
              </>
            ) : (
              <>
                <span className="flex-1" />
                <button type="button" onClick={onClose} className={btnSecondary}>
                  {tc("close")}
                </button>
              </>
            )}
          </div>
        </form>
      </Modal>

      {confirmDiscard && (
        <ConfirmDialog
          title={t("discardTitle")}
          body={t("discardBody")}
          confirmLabel={t("discardConfirm")}
          onConfirm={onClose}
          onClose={() => setConfirmDiscard(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("deleteTaskTitle")}
          body={t("deleteTaskBody", { name: task.name })}
          confirmLabel={t("menuDelete")}
          onConfirm={async () => {
            await deleteTask.mutateAsync(task.id);
            onDeleted?.();
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
