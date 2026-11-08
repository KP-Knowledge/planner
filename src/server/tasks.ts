import { asc, eq, inArray, max } from "drizzle-orm";
import { dependencies, sections, taskAssignees, tasks, teams, users } from "@/db/schema";
import type { Db } from "@/db/types";
import { todayInBangkok } from "@/lib/dates";
import { cascade } from "@/lib/schedule";
import { snapToWorkday } from "@/lib/workdays";
import { getHolidaySet } from "./holidaySet";
import { ApiError } from "./errors";
import type { TaskCreate, TaskPatch } from "./schemas";

export type TaskRow = typeof tasks.$inferSelect;
export type Task = TaskRow & { assigneeIds: string[] };

export async function attachAssignees(db: Db, rows: TaskRow[]): Promise<Task[]> {
  if (rows.length === 0) return [];
  const links = await db
    .select()
    .from(taskAssignees)
    .where(
      inArray(
        taskAssignees.taskId,
        rows.map((r) => r.id),
      ),
    );
  const byTask = new Map<string, string[]>();
  for (const l of links) byTask.set(l.taskId, [...(byTask.get(l.taskId) ?? []), l.userId]);
  return rows.map((r) => ({ ...r, assigneeIds: (byTask.get(r.id) ?? []).sort() }));
}

export async function loadTasks(db: Db, ids: string[]): Promise<Task[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(tasks).where(inArray(tasks.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.flatMap((id) => byId.get(id) ?? []);
  return attachAssignees(db, ordered);
}

export async function listProjectTasks(db: Db, projectId: string): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt), asc(tasks.id));
  return attachAssignees(db, rows);
}

/**
 * Runs the dependency cascade over a project starting from `changedIds`
 * and persists every moved task. Returns the ids that moved.
 */
export async function cascadeProject(
  db: Db,
  projectId: string,
  changedIds: string[],
): Promise<string[]> {
  const rows = await db
    .select({ id: tasks.id, startDate: tasks.startDate, endDate: tasks.endDate })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));
  const deps = await db
    .select({
      predecessorId: dependencies.predecessorId,
      successorId: dependencies.successorId,
    })
    .from(dependencies)
    .where(eq(dependencies.projectId, projectId));
  const h = await getHolidaySet(db, projectId);

  const moved = cascade(rows, deps, changedIds, h).filter((t) => !changedIds.includes(t.id));
  for (const t of moved) {
    await db
      .update(tasks)
      .set({ startDate: t.startDate, endDate: t.endDate })
      .where(eq(tasks.id, t.id));
  }
  return moved.map((t) => t.id);
}

export async function createTask(db: Db, input: TaskCreate): Promise<Task> {
  return db.transaction(async (tx) => {
    let projectId: string;
    let sectionId: string;
    let parentId: string | null = null;

    if (input.parentId) {
      const [parent] = await tx.select().from(tasks).where(eq(tasks.id, input.parentId));
      if (!parent) throw new ApiError(404, "not_found");
      if (parent.parentId) throw new ApiError(400, "nesting", "subtasks are one level deep");
      if (input.sectionId && input.sectionId !== parent.sectionId) {
        const [s] = await tx.select().from(sections).where(eq(sections.id, input.sectionId));
        if (!s) throw new ApiError(404, "not_found");
        throw new ApiError(
          400,
          s.projectId === parent.projectId ? "section_mismatch" : "cross_project",
        );
      }
      projectId = parent.projectId;
      sectionId = parent.sectionId;
      parentId = parent.id;
    } else if (input.sectionId) {
      const [s] = await tx.select().from(sections).where(eq(sections.id, input.sectionId));
      if (!s) throw new ApiError(404, "not_found");
      projectId = s.projectId;
      sectionId = s.id;
    } else {
      throw new ApiError(400, "section_required");
    }

    let startDate = input.startDate;
    if (!startDate) {
      const h = await getHolidaySet(tx, projectId);
      startDate = snapToWorkday(todayInBangkok(), h);
    }
    let endDate = input.endDate ?? startDate;
    if (input.isMilestone) endDate = startDate;
    if (endDate < startDate) throw new ApiError(400, "invalid_range", "endDate is before startDate");

    const [{ last }] = await tx
      .select({ last: max(tasks.sortOrder) })
      .from(tasks)
      .where(eq(tasks.sectionId, sectionId));

    const [row] = await tx
      .insert(tasks)
      .values({
        projectId,
        sectionId,
        parentId,
        name: input.name,
        startDate,
        endDate,
        isMilestone: input.isMilestone ?? false,
        sortOrder: (last ?? -1) + 1,
      })
      .returning();
    return { ...row, assigneeIds: [] };
  });
}

export async function updateTask(
  db: Db,
  id: string,
  patch: TaskPatch,
): Promise<{ tasks: Task[] }> {
  return db.transaction(async (tx) => {
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, id));
    if (!task) throw new ApiError(404, "not_found");

    if (patch.teamId) {
      const [t] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, patch.teamId));
      if (!t) throw new ApiError(400, "invalid_reference", "unknown teamId");
    }
    const assigneeIds = patch.assigneeIds ? [...new Set(patch.assigneeIds)] : undefined;
    if (assigneeIds && assigneeIds.length > 0) {
      const found = await tx
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, assigneeIds));
      if (found.length !== assigneeIds.length) {
        throw new ApiError(400, "invalid_reference", "unknown assigneeIds");
      }
    }

    const isMilestone = patch.isMilestone ?? task.isMilestone;
    const startDate = patch.startDate ?? task.startDate;
    const endDate = isMilestone ? startDate : (patch.endDate ?? task.endDate);
    if (endDate < startDate) throw new ApiError(400, "invalid_range", "endDate is before startDate");
    const datesChanged = startDate !== task.startDate || endDate !== task.endDate;

    const set: Partial<typeof tasks.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.progress !== undefined) set.progress = patch.progress;
    if (patch.teamId !== undefined) set.teamId = patch.teamId;
    if (patch.color !== undefined) set.color = patch.color;
    if (isMilestone !== task.isMilestone) set.isMilestone = isMilestone;
    if (datesChanged) {
      set.startDate = startDate;
      set.endDate = endDate;
    }
    if (Object.keys(set).length > 0) {
      await tx.update(tasks).set(set).where(eq(tasks.id, id));
    }

    if (assigneeIds) {
      await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
      if (assigneeIds.length > 0) {
        await tx.insert(taskAssignees).values(assigneeIds.map((userId) => ({ taskId: id, userId })));
      }
    }

    const movedIds = datesChanged ? await cascadeProject(tx, task.projectId, [id]) : [];
    return { tasks: await loadTasks(tx, [id, ...movedIds]) };
  });
}

export async function deleteTask(db: Db, id: string): Promise<void> {
  const rows = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });
  if (rows.length === 0) throw new ApiError(404, "not_found");
}
