import type { Task } from "@/server/tasks";
import { resolveDraft } from "./dateInput";
import type { TaskPatchInput } from "./optimistic";

export type TaskDraft = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  isMilestone: boolean;
  /** Empty string means no team. */
  teamId: string;
  color: string | null;
  assigneeIds: string[];
};

export type DraftValidation =
  | { ok: true }
  | { ok: false; name: "empty" | null; dates: "incomplete" | "year" | "range" | null };

export function initialDraft(task: Task): TaskDraft {
  return {
    name: task.name,
    description: task.description ?? "",
    startDate: task.startDate,
    endDate: task.endDate,
    progress: task.progress,
    isMilestone: task.isMilestone,
    teamId: task.teamId ?? "",
    color: task.color,
    assigneeIds: [...task.assigneeIds],
  };
}

export function validateDraft(draft: TaskDraft): DraftValidation {
  const name = draft.name.trim() === "" ? "empty" : null;
  const result = resolveDraft({ start: draft.startDate, end: draft.endDate }, draft.isMilestone);
  const dates = result.ok ? null : result.reason;
  if (name === null && dates === null) return { ok: true };
  return { ok: false, name, dates };
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** Only the fields whose draft value differs from the stored task. Assumes the draft is valid. */
export function draftToPatch(task: Task, draft: TaskDraft): TaskPatchInput {
  const patch: TaskPatchInput = {};
  const name = draft.name.trim();
  if (name !== task.name) patch.name = name;

  const description = draft.description.trim() === "" ? null : draft.description;
  if (description !== task.description) patch.description = description;

  if (draft.isMilestone !== task.isMilestone) patch.isMilestone = draft.isMilestone;

  const endDate = draft.isMilestone ? draft.startDate : draft.endDate;
  if (draft.startDate !== task.startDate) patch.startDate = draft.startDate;
  if (endDate !== task.endDate) patch.endDate = endDate;

  if (!draft.isMilestone && draft.progress !== task.progress) patch.progress = draft.progress;

  const teamId = draft.teamId === "" ? null : draft.teamId;
  if (teamId !== task.teamId) patch.teamId = teamId;

  if (draft.color !== task.color) patch.color = draft.color;

  if (!sameSet(draft.assigneeIds, task.assigneeIds)) patch.assigneeIds = draft.assigneeIds;

  return patch;
}

export function isDirty(task: Task, draft: TaskDraft): boolean {
  return Object.keys(draftToPatch(task, draft)).length > 0;
}
