import type { ISODate } from "@/lib/dates";
import { cascade, moveTask, resizeTask, resizeTaskStart } from "@/lib/schedule";
import type { HolidaySet } from "@/lib/workdays";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";

export type DragKind = "move" | "resize-start" | "resize-end";

/** Replaces tasks by id. Ids that are not in `data` are ignored. */
export function applyTaskUpdate(data: GanttData, updated: readonly Task[]): GanttData {
  if (updated.length === 0) return data;
  const byId = new Map(updated.map((t) => [t.id, t]));
  return { ...data, tasks: data.tasks.map((t) => byId.get(t.id) ?? t) };
}

/** Removes a task, its subtasks and every dependency touching them. */
export function removeTask(data: GanttData, taskId: string): GanttData {
  const gone = new Set(data.tasks.filter((t) => t.id === taskId || t.parentId === taskId).map((t) => t.id));
  return {
    ...data,
    tasks: data.tasks.filter((t) => !gone.has(t.id)),
    dependencies: data.dependencies.filter(
      (d) => !gone.has(d.predecessorId) && !gone.has(d.successorId),
    ),
  };
}

/**
 * Live drag preview: the dragged task with its new dates, followed by every
 * task the dependency cascade pushes. Uses the same functions as the server.
 */
export function previewDrag(
  data: GanttData,
  taskId: string,
  kind: DragKind,
  targetDate: ISODate,
  h: HolidaySet,
): Task[] {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return [];

  let next: { startDate: ISODate; endDate: ISODate };
  if (task.isMilestone) {
    // Milestones only move; a resize leaves them where they are.
    const startDate = kind === "move" ? moveTask(task, targetDate, h).startDate : task.startDate;
    next = { startDate, endDate: startDate };
  } else if (kind === "move") {
    next = moveTask(task, targetDate, h);
  } else if (kind === "resize-start") {
    next = resizeTaskStart(task, targetDate, h);
  } else {
    next = resizeTask(task, targetDate, h);
  }
  const edited: Task = { ...task, startDate: next.startDate, endDate: next.endDate };

  const sched = data.tasks.map((t) => (t.id === taskId ? edited : t));
  const moved = cascade(sched, data.dependencies, [taskId], h);
  const byId = new Map(data.tasks.map((t) => [t.id, t]));
  const pushed = moved
    .filter((m) => m.id !== taskId)
    .map((m) => ({ ...byId.get(m.id)!, startDate: m.startDate, endDate: m.endDate }));
  return [edited, ...pushed];
}

export type OrderPayload = { id: string; taskIds: string[] }[];

/** Applies a PUT /order payload locally: section order, task order, and section moves (subtasks follow their parent). */
export function applyOrder(data: GanttData, order: OrderPayload): GanttData {
  const sectionIndex = new Map(order.map((s, i) => [s.id, i]));
  const placement = new Map<string, { sectionId: string; sortOrder: number }>();
  for (const s of order) s.taskIds.forEach((id, j) => placement.set(id, { sectionId: s.id, sortOrder: j }));
  return {
    ...data,
    sections: data.sections.map((s) => {
      const i = sectionIndex.get(s.id);
      return i === undefined ? s : { ...s, sortOrder: i };
    }),
    tasks: data.tasks.map((t) => {
      const own = placement.get(t.id);
      if (own) return { ...t, ...own };
      const parent = t.parentId ? placement.get(t.parentId) : undefined;
      return parent ? { ...t, sectionId: parent.sectionId } : t;
    }),
  };
}

export type TaskPatchInput = Partial<
  Pick<
    Task,
    "name" | "description" | "startDate" | "endDate" | "progress" | "isMilestone" | "teamId" | "color" | "assigneeIds"
  >
>;

/** Mirrors the server's PATCH: applies fields as given, milestone forces end = start, then cascades. */
export function applyPatch(data: GanttData, taskId: string, patch: TaskPatchInput): GanttData {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return data;
  const merged: Task = { ...task, ...patch };
  if (merged.isMilestone) merged.endDate = merged.startDate;
  const h = new Set(data.holidays.map((x) => x.date));
  const datesChanged = merged.startDate !== task.startDate || merged.endDate !== task.endDate;
  const updated: Task[] = [merged];
  if (datesChanged) {
    const sched = data.tasks.map((t) => (t.id === taskId ? merged : t));
    const byId = new Map(data.tasks.map((t) => [t.id, t]));
    for (const m of cascade(sched, data.dependencies, [taskId], h)) {
      if (m.id !== taskId) updated.push({ ...byId.get(m.id)!, startDate: m.startDate, endDate: m.endDate });
    }
  }
  return applyTaskUpdate(data, updated);
}
