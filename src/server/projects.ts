import { and, asc, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { dependencies, holidays, projects, sections, tasks, teams } from "@/db/schema";
import type { Db } from "@/db/types";
import { ApiError } from "./errors";
import type { OrderBody, ProjectCreate, ProjectPatch } from "./schemas";
import type { Dependency } from "./dependencies";
import type { Section } from "./sections";
import { listProjectTasks, type Task } from "./tasks";
import type { Team } from "./teams";
import { listUsers, type User } from "./users";

export type Project = typeof projects.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;

export type GanttData = {
  project: Project;
  sections: Section[];
  tasks: Task[];
  dependencies: Dependency[];
  holidays: Holiday[];
  teams: Team[];
  users: User[];
};

export async function listProjects(db: Db, archived: boolean): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt))
    .orderBy(desc(projects.createdAt), asc(projects.id));
}

export async function createProject(db: Db, input: ProjectCreate): Promise<Project> {
  const [row] = await db
    .insert(projects)
    .values({ name: input.name, description: input.description ?? null })
    .returning();
  return row;
}

async function requireProject(db: Db, id: string): Promise<Project> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

export async function updateProject(db: Db, id: string, patch: ProjectPatch): Promise<Project> {
  const current = await requireProject(db, id);
  const set: Partial<typeof projects.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.archived === true && !current.archivedAt) set.archivedAt = new Date();
  if (patch.archived === false) set.archivedAt = null;
  if (Object.keys(set).length === 0) return current;
  const [row] = await db.update(projects).set(set).where(eq(projects.id, id)).returning();
  return row;
}

export async function deleteProject(db: Db, id: string): Promise<void> {
  const project = await requireProject(db, id);
  if (!project.archivedAt) {
    throw new ApiError(409, "not_archived", "archive the project before deleting it");
  }
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getGantt(db: Db, projectId: string): Promise<GanttData> {
  const project = await requireProject(db, projectId);
  const [projectSections, projectTasks, projectDeps, projectHolidays, allTeams, allUsers] =
    await Promise.all([
      db
        .select()
        .from(sections)
        .where(eq(sections.projectId, projectId))
        .orderBy(asc(sections.sortOrder), asc(sections.createdAt), asc(sections.id)),
      listProjectTasks(db, projectId),
      db.select().from(dependencies).where(eq(dependencies.projectId, projectId)),
      db
        .select()
        .from(holidays)
        .where(or(isNull(holidays.projectId), eq(holidays.projectId, projectId)))
        .orderBy(asc(holidays.date)),
      db.select().from(teams).orderBy(asc(teams.name), asc(teams.id)),
      listUsers(db),
    ]);
  return {
    project,
    sections: projectSections,
    tasks: projectTasks,
    dependencies: projectDeps,
    holidays: projectHolidays,
    teams: allTeams,
    users: allUsers,
  };
}

export async function reorder(db: Db, projectId: string, body: OrderBody): Promise<void> {
  await db.transaction(async (tx) => {
    await requireProject(tx, projectId);

    const sectionIds = body.sections.map((s) => s.id);
    if (new Set(sectionIds).size !== sectionIds.length) throw new ApiError(400, "duplicate");
    const taskIds = body.sections.flatMap((s) => s.taskIds);
    if (new Set(taskIds).size !== taskIds.length) throw new ApiError(400, "duplicate");

    if (sectionIds.length > 0) {
      const found = await tx
        .select({ id: sections.id })
        .from(sections)
        .where(and(eq(sections.projectId, projectId), inArray(sections.id, sectionIds)));
      if (found.length !== sectionIds.length) {
        throw new ApiError(400, "invalid_reference", "section is not in this project");
      }
    }
    if (taskIds.length > 0) {
      const found = await tx
        .select({ id: tasks.id, parentId: tasks.parentId })
        .from(tasks)
        .where(and(eq(tasks.projectId, projectId), inArray(tasks.id, taskIds)));
      if (found.length !== taskIds.length) {
        throw new ApiError(400, "invalid_reference", "task is not in this project");
      }
      if (found.some((t) => t.parentId)) {
        throw new ApiError(400, "nesting", "only top-level tasks can be reordered");
      }
    }

    for (const [i, s] of body.sections.entries()) {
      await tx.update(sections).set({ sortOrder: i }).where(eq(sections.id, s.id));
      for (const [j, taskId] of s.taskIds.entries()) {
        await tx
          .update(tasks)
          .set({ sectionId: s.id, sortOrder: j })
          .where(eq(tasks.id, taskId));
      }
      if (s.taskIds.length > 0) {
        await tx
          .update(tasks)
          .set({ sectionId: s.id })
          .where(inArray(tasks.parentId, s.taskIds));
      }
    }
  });
}
