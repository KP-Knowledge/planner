import type { GanttData } from "@/server/projects";
import type { OrderPayload } from "./optimistic";

const ADD_PREFIX = "add:";

export const addRowId = (sectionId: string) => `${ADD_PREFIX}${sectionId}`;

function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/**
 * Full order body (every section, top-level task ids only) after dropping
 * `activeId` on `overId`. Returns null when nothing would change or the drag is
 * not allowed (subtasks cannot be dragged on their own).
 *
 * `overId` may be a section id, a task id (a subtask counts as its parent), or
 * an add-row id (drops at the end of that section).
 */
export function buildOrder(
  data: Pick<GanttData, "sections" | "tasks">,
  activeId: string,
  overId: string,
): OrderPayload | null {
  if (activeId === overId) return null;

  const sections = [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const sectionIds = sections.map((s) => s.id);
  const lists = new Map<string, string[]>(sections.map((s) => [s.id, []]));
  const tasksById = new Map(data.tasks.map((t) => [t.id, t]));
  for (const t of [...data.tasks].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (t.parentId === null) lists.get(t.sectionId)?.push(t.id);
  }
  const result = (order: string[]): OrderPayload =>
    order.map((id) => ({ id, taskIds: lists.get(id) ?? [] }));

  const overAdd = overId.startsWith(ADD_PREFIX);
  let overSection: string | undefined;
  let overTask: string | undefined;
  if (overAdd) {
    overSection = overId.slice(ADD_PREFIX.length);
  } else if (lists.has(overId)) {
    overSection = overId;
  } else {
    const t = tasksById.get(overId);
    if (t) {
      overTask = t.parentId ?? t.id;
      overSection = t.parentId ? tasksById.get(t.parentId)?.sectionId : t.sectionId;
    }
  }
  if (overSection === undefined || !lists.has(overSection)) return null;

  if (lists.has(activeId)) {
    const from = sectionIds.indexOf(activeId);
    const to = sectionIds.indexOf(overSection);
    if (from === to) return null;
    return result(arrayMove(sectionIds, from, to));
  }

  const active = tasksById.get(activeId);
  if (!active || active.parentId !== null) return null;

  const source = lists.get(active.sectionId)!;
  const oldIndex = source.indexOf(activeId);

  if (overSection === active.sectionId) {
    const newIndex = overTask !== undefined ? source.indexOf(overTask) : overAdd ? source.length - 1 : 0;
    if (newIndex === oldIndex) return null;
    lists.set(overSection, arrayMove(source, oldIndex, newIndex));
    return result(sectionIds);
  }

  source.splice(oldIndex, 1);
  const target = lists.get(overSection)!;
  const index = overTask !== undefined ? target.indexOf(overTask) : overAdd ? target.length : 0;
  target.splice(index, 0, activeId);
  return result(sectionIds);
}
