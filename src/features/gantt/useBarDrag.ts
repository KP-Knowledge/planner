import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { addDays, type ISODate } from "@/lib/dates";
import { isWorkday, type HolidaySet } from "@/lib/workdays";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";
import { PX_PER_DAY, dateToX, xToDate, type Zoom } from "./layout";
import { previewDrag, type DragKind } from "./optimistic";

/** Pointer travel below this many px counts as a click, not a drag. */
export const CLICK_THRESHOLD = 3;

/**
 * Date under the dragged edge after moving the pointer `dx` px. Move and
 * resize-start track the start edge, resize-end tracks the end day. Rounds to
 * the nearest day.
 */
export function dragTargetDate(
  kind: DragKind,
  task: Pick<Task, "startDate" | "endDate">,
  dx: number,
  origin: ISODate,
  zoom: Zoom,
): ISODate {
  const edge = kind === "resize-end" ? task.endDate : task.startDate;
  return xToDate(dateToX(edge, origin, zoom) + dx + PX_PER_DAY[zoom] / 2, origin, zoom);
}

/**
 * Arrow keys on a focused bar. Left/right moves the task one day (going back
 * it steps to the previous workday so a Monday task does not snap onto
 * itself). Shift resizes the end by one day, skipping non-workdays going
 * forward. Milestones cannot resize.
 */
export function keyboardDrag(
  task: Pick<Task, "startDate" | "endDate" | "isMilestone">,
  key: string,
  shift: boolean,
  h: HolidaySet,
): { kind: DragKind; target: ISODate } | null {
  const dir = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  if (dir === 0) return null;
  if (shift) {
    if (task.isMilestone) return null;
    let d = addDays(task.endDate, dir);
    while (dir > 0 && !isWorkday(d, h)) d = addDays(d, 1);
    return { kind: "resize-end", target: d };
  }
  let d = addDays(task.startDate, dir);
  while (dir < 0 && !isWorkday(d, h)) d = addDays(d, -1);
  return { kind: "move", target: d };
}

export type PointerHandlers = {
  onPointerDown: (e: PointerEvent<SVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGElement>) => void;
  onPointerCancel: (e: PointerEvent<SVGElement>) => void;
};

export type BarBindings = {
  move: PointerHandlers;
  resizeStart: PointerHandlers;
  resizeEnd: PointerHandlers;
  onKeyDown: (e: KeyboardEvent<SVGElement>) => void;
};

type Active = {
  pointerId: number;
  startX: number;
  moved: boolean;
  target: ISODate | null;
  tasks: Task[] | null;
};

type Preview = { seq: number; tasks: ReadonlyMap<string, Task> };

export function useBarDrag({
  data,
  origin,
  zoom,
  holidays,
  onSelect,
  onCommit,
}: {
  data: GanttData;
  origin: ISODate;
  zoom: Zoom;
  holidays: HolidaySet;
  onSelect?: (taskId: string) => void;
  /** Called once per finished drag with the dragged task's final dates. */
  onCommit: (taskId: string, dates: { startDate: ISODate; endDate: ISODate }) => Promise<unknown> | void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const active = useRef<Active | null>(null);
  const seq = useRef(0);

  const findTask = (id: string) => data.tasks.find((t) => t.id === id);

  // `tasks[0]` is the dragged task, the rest were pushed by the cascade. The
  // preview stays until the save settles so the bar does not jump back before
  // the optimistic cache update lands.
  const commit = (tasks: readonly Task[]) => {
    const edited = tasks[0];
    const orig = edited && findTask(edited.id);
    if (!edited || !orig || (orig.startDate === edited.startDate && orig.endDate === edited.endDate)) {
      setPreview(null);
      return;
    }
    const id = ++seq.current;
    setPreview({ seq: id, tasks: new Map(tasks.map((t) => [t.id, t])) });
    const clear = () => setPreview((p) => (p?.seq === id ? null : p));
    Promise.resolve(onCommit(edited.id, { startDate: edited.startDate, endDate: edited.endDate })).then(
      clear,
      clear,
    );
  };

  const pointerHandlers = (taskId: string, kind: DragKind): PointerHandlers => ({
    onPointerDown(e) {
      if (e.button !== 0 || !e.isPrimary || !findTask(taskId)) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      active.current = { pointerId: e.pointerId, startX: e.clientX, moved: false, target: null, tasks: null };
    },
    onPointerMove(e) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      const dx = e.clientX - a.startX;
      if (!a.moved && Math.abs(dx) < CLICK_THRESHOLD) return;
      a.moved = true;
      const task = findTask(taskId);
      if (!task) return;
      const target = dragTargetDate(kind, task, dx, origin, zoom);
      if (target === a.target) return;
      a.target = target;
      a.tasks = previewDrag(data, taskId, kind, target, holidays);
      setPreview({ seq: 0, tasks: new Map(a.tasks.map((t) => [t.id, t])) });
    },
    onPointerUp(e) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      active.current = null;
      if (!a.moved) onSelect?.(taskId);
      else if (a.tasks) commit(a.tasks);
      else setPreview(null);
    },
    onPointerCancel(e) {
      const a = active.current;
      if (!a || a.pointerId !== e.pointerId) return;
      active.current = null;
      if (a.moved) setPreview(null);
    },
  });

  const bindings = (taskId: string): BarBindings => ({
    move: pointerHandlers(taskId, "move"),
    resizeStart: pointerHandlers(taskId, "resize-start"),
    resizeEnd: pointerHandlers(taskId, "resize-end"),
    onKeyDown(e) {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.(taskId);
        return;
      }
      const task = findTask(taskId);
      const step = task && keyboardDrag(task, e.key, e.shiftKey, holidays);
      if (!step) return;
      e.preventDefault();
      commit(previewDrag(data, taskId, step.kind, step.target, holidays));
    },
  });

  return { preview: preview?.tasks ?? null, bindings };
}
