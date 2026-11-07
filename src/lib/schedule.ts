import { addDays, type ISODate } from "./dates";
import {
  addWorkdays,
  countWorkdays,
  isWorkday,
  snapToWorkday,
  type HolidaySet,
} from "./workdays";

export type SchedTask = { id: string; startDate: ISODate; endDate: ISODate };
export type Dep = { predecessorId: string; successorId: string };

export function workdayDuration(t: SchedTask, h: HolidaySet): number {
  return Math.max(1, countWorkdays(t.startDate, t.endDate, h));
}

export function moveTask(t: SchedTask, newStart: ISODate, h: HolidaySet): SchedTask {
  const startDate = snapToWorkday(newStart, h);
  const endDate = addWorkdays(startDate, workdayDuration(t, h) - 1, h);
  return { ...t, startDate, endDate };
}

export function resizeTask(t: SchedTask, newEnd: ISODate, h: HolidaySet): SchedTask {
  let endDate = newEnd;
  while (endDate > t.startDate && !isWorkday(endDate, h)) endDate = addDays(endDate, -1);
  if (endDate < t.startDate) endDate = t.startDate;
  return { ...t, endDate };
}

export function resizeTaskStart(t: SchedTask, newStart: ISODate, h: HolidaySet): SchedTask {
  const snapped = snapToWorkday(newStart, h);
  return { ...t, startDate: snapped > t.endDate ? t.endDate : snapped };
}

export function cascade(
  tasks: SchedTask[],
  deps: Dep[],
  changedIds: string[],
  h: HolidaySet,
): SchedTask[] {
  const original = new Map(tasks.map((t) => [t.id, t]));
  const current = new Map(original);
  const succs = new Map<string, string[]>();
  const preds = new Map<string, string[]>();
  for (const d of deps) {
    succs.set(d.predecessorId, [...(succs.get(d.predecessorId) ?? []), d.successorId]);
    preds.set(d.successorId, [...(preds.get(d.successorId) ?? []), d.predecessorId]);
  }

  const queue = [...changedIds];
  let budget = (tasks.length + 1) * (deps.length + 1);
  while (queue.length > 0 && budget-- > 0) {
    const id = queue.shift()!;
    for (const sid of succs.get(id) ?? []) {
      const succ = current.get(sid);
      if (!succ) continue;
      let required: ISODate | null = null;
      for (const pid of preds.get(sid) ?? []) {
        const pred = current.get(pid);
        if (!pred || succ.startDate > pred.endDate) continue;
        const next = addWorkdays(pred.endDate, 1, h);
        if (required === null || next > required) required = next;
      }
      if (required === null) continue;
      const moved = moveTask(succ, required, h);
      if (moved.startDate === succ.startDate && moved.endDate === succ.endDate) continue;
      current.set(sid, moved);
      queue.push(sid);
    }
  }

  const changed: SchedTask[] = [];
  for (const [id, t] of current) {
    const o = original.get(id)!;
    if (o.startDate !== t.startDate || o.endDate !== t.endDate) changed.push(t);
  }
  return changed;
}

export function wouldCreateCycle(
  deps: Dep[],
  predecessorId: string,
  successorId: string,
): boolean {
  if (predecessorId === successorId) return true;
  const succs = new Map<string, string[]>();
  for (const d of deps) {
    succs.set(d.predecessorId, [...(succs.get(d.predecessorId) ?? []), d.successorId]);
  }
  const seen = new Set<string>();
  const stack = [successorId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === predecessorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(succs.get(id) ?? []));
  }
  return false;
}
