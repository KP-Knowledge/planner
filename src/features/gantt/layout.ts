import { addDays, dayOfWeek, diffDays, type ISODate } from "@/lib/dates";
import type { GanttData } from "@/server/projects";
import type { Section } from "@/server/sections";
import type { Task } from "@/server/tasks";

export type Zoom = "day" | "week" | "month";

export const PX_PER_DAY: Record<Zoom, number> = { day: 36, week: 16, month: 4 };
export const ROW_HEIGHT = 36;
export const HEADER_ROW_HEIGHT = 28;
export const HEADER_HEIGHT = HEADER_ROW_HEIGHT * 2;
export const BAR_HEIGHT = 22;
export const MILESTONE_SIZE = 14;
// Half of the rotated square's diagonal (14 × √2 / 2 ≈ 9.9), rounded up.
export const MILESTONE_HALF = 10;
export const GRID_WIDTH = 640;
export const AVATAR_SIZE = 18;
export const AVATAR_STEP = 14;
export const MAX_AVATARS = 3;
const ELBOW = 8;

export function dateToX(d: ISODate, origin: ISODate, zoom: Zoom): number {
  return diffDays(origin, d) * PX_PER_DAY[zoom];
}

export function xToDate(x: number, origin: ISODate, zoom: Zoom): ISODate {
  return addDays(origin, Math.floor(x / PX_PER_DAY[zoom]));
}

export function barGeometry(
  t: { startDate: ISODate; endDate: ISODate },
  origin: ISODate,
  zoom: Zoom,
): { x: number; width: number } {
  const px = PX_PER_DAY[zoom];
  return {
    x: dateToX(t.startDate, origin, zoom),
    width: (diffDays(t.startDate, t.endDate) + 1) * px,
  };
}

/** Like barGeometry, but a milestone is a fixed-size box centered on its day. */
export function taskGeometry(
  t: { startDate: ISODate; endDate: ISODate; isMilestone: boolean },
  origin: ISODate,
  zoom: Zoom,
): { x: number; width: number } {
  if (!t.isMilestone) return barGeometry(t, origin, zoom);
  const center = dateToX(t.startDate, origin, zoom) + PX_PER_DAY[zoom] / 2;
  return { x: center - MILESTONE_HALF, width: MILESTONE_HALF * 2 };
}

export type Row =
  | { kind: "section"; section: Section }
  | { kind: "task"; task: Task; depth: 0 | 1 }
  | { kind: "add"; sectionId: string };

const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

/** With `editable`, an "add task" row closes every expanded section. */
export function visibleRows(
  data: GanttData,
  collapsed: ReadonlySet<string>,
  opts: { editable?: boolean } = {},
): Row[] {
  const childrenOf = new Map<string, Task[]>();
  const topBySection = new Map<string, Task[]>();
  for (const t of data.tasks) {
    const bucket = t.parentId ? childrenOf : topBySection;
    const key = t.parentId ?? t.sectionId;
    const list = bucket.get(key);
    if (list) list.push(t);
    else bucket.set(key, [t]);
  }

  const rows: Row[] = [];
  for (const section of [...data.sections].sort(bySort)) {
    rows.push({ kind: "section", section });
    if (collapsed.has(section.id)) continue;
    for (const task of (topBySection.get(section.id) ?? []).sort(bySort)) {
      rows.push({ kind: "task", task, depth: 0 });
      if (collapsed.has(task.id)) continue;
      for (const child of (childrenOf.get(task.id) ?? []).sort(bySort)) {
        rows.push({ kind: "task", task: child, depth: 1 });
      }
    }
    if (opts.editable) rows.push({ kind: "add", sectionId: section.id });
  }
  return rows;
}

/** Width in px of the SVG avatar stack: up to MAX_AVATARS circles plus a "+N" circle. */
export function avatarStackWidth(count: number): number {
  const slots = Math.min(count, MAX_AVATARS) + (count > MAX_AVATARS ? 1 : 0);
  return slots === 0 ? 0 : (slots - 1) * AVATAR_STEP + AVATAR_SIZE;
}

/** Rough label width; good enough to decide between inside and outside placement. */
export function estimateTextWidth(text: string): number {
  return Array.from(text).length * 7;
}

const rowMid = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2;

/**
 * Elbow from the right edge of the predecessor bar to the left edge of the
 * successor bar. The path ends horizontally at `to.x`, so an arrow marker with
 * `orient="auto"` points into the successor.
 */
export function dependencyPath(
  from: { x: number; width: number; row: number },
  to: { x: number; row: number },
): string {
  const sx = from.x + from.width;
  const sy = rowMid(from.row);
  const ey = rowMid(to.row);
  const out = sx + ELBOW;

  if (to.x >= out + ELBOW) {
    return `M${sx} ${sy} H${out} V${ey} H${to.x}`;
  }
  // Successor starts too early to fit the elbow: run along the row boundary
  // next to the predecessor, then come in from the left of the successor.
  const lane = to.row >= from.row ? (from.row + 1) * ROW_HEIGHT : from.row * ROW_HEIGHT;
  const approach = to.x - ELBOW;
  return `M${sx} ${sy} H${out} V${lane} H${approach} V${ey} H${to.x}`;
}

export function timelineRange(
  tasks: ReadonlyArray<{ startDate: ISODate; endDate: ISODate }>,
  today: ISODate,
): { origin: ISODate; end: ISODate } {
  if (tasks.length === 0) return { origin: addDays(today, -14), end: addDays(today, 60) };
  let min = tasks[0].startDate;
  let max = tasks[0].endDate;
  for (const t of tasks) {
    if (t.startDate < min) min = t.startDate;
    if (t.endDate > max) max = t.endDate;
  }
  return { origin: addDays(min, -14), end: addDays(max, 30) };
}

/** ISO 8601 week number (weeks start on Monday, week 1 contains the first Thursday). */
export function isoWeek(d: ISODate): number {
  const thursday = addDays(d, 3 - ((dayOfWeek(d) + 6) % 7));
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(diffDays(jan1, thursday) / 7) + 1;
}

export type HeaderSegment = {
  /** First day shown in this segment (clipped to the range). */
  date: ISODate;
  x: number;
  width: number;
  days: number;
};

function segments(
  origin: ISODate,
  end: ISODate,
  px: number,
  key: (d: ISODate) => string,
): HeaderSegment[] {
  const out: HeaderSegment[] = [];
  let current: { key: string; seg: HeaderSegment } | null = null;
  const total = diffDays(origin, end) + 1;
  for (let i = 0; i < total; i++) {
    const d = addDays(origin, i);
    const k = key(d);
    if (current && current.key === k) {
      current.seg.days++;
      current.seg.width += px;
    } else {
      current = { key: k, seg: { date: d, x: i * px, width: px, days: 1 } };
      out.push(current.seg);
    }
  }
  return out;
}

const monday = (d: ISODate) => addDays(d, -((dayOfWeek(d) + 6) % 7));

/**
 * Two header rows covering origin..end (inclusive).
 * day: month / day, week: month / ISO week, month: year / month.
 */
export function headerSegments(
  origin: ISODate,
  end: ISODate,
  zoom: Zoom,
): { top: HeaderSegment[]; bottom: HeaderSegment[] } {
  const px = PX_PER_DAY[zoom];
  const month = (d: ISODate) => d.slice(0, 7);
  const year = (d: ISODate) => d.slice(0, 4);
  switch (zoom) {
    case "day":
      return { top: segments(origin, end, px, month), bottom: segments(origin, end, px, (d) => d) };
    case "week":
      return { top: segments(origin, end, px, month), bottom: segments(origin, end, px, monday) };
    case "month":
      return { top: segments(origin, end, px, year), bottom: segments(origin, end, px, month) };
  }
}

export type NonWorkingDay = { date: ISODate; weekend: boolean; holidays: string[] };

export function nonWorkingDays(
  origin: ISODate,
  end: ISODate,
  holidayNames: ReadonlyMap<ISODate, string[]>,
): NonWorkingDay[] {
  const out: NonWorkingDay[] = [];
  const total = diffDays(origin, end) + 1;
  for (let i = 0; i < total; i++) {
    const date = addDays(origin, i);
    const dow = dayOfWeek(date);
    const weekend = dow === 0 || dow === 6;
    const holidays = holidayNames.get(date) ?? [];
    if (weekend || holidays.length > 0) out.push({ date, weekend, holidays });
  }
  return out;
}

export function holidayNameMap(
  holidays: ReadonlyArray<{ date: ISODate; name: string }>,
): Map<ISODate, string[]> {
  const map = new Map<ISODate, string[]>();
  for (const h of holidays) {
    const list = map.get(h.date);
    if (list) list.push(h.name);
    else map.set(h.date, [h.name]);
  }
  return map;
}

/** First `max` items plus the count that did not fit ("+N"). */
export function splitAvatars<T>(items: readonly T[], max = MAX_AVATARS): { shown: T[]; extra: number } {
  return { shown: items.slice(0, max), extra: Math.max(0, items.length - max) };
}

/**
 * Number of tasks under each collapsible row: tasks in a section (subtasks
 * included) and subtasks of a task. Ids with no children are absent.
 */
export function childCounts(data: Pick<GanttData, "tasks">): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const t of data.tasks) {
    bump(t.sectionId);
    if (t.parentId) bump(t.parentId);
  }
  return counts;
}
