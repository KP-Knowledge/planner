import { eq, sql } from "drizzle-orm";
import { dependencies, tasks } from "@/db/schema";
import type { Db } from "@/db/types";
import { wouldCreateCycle } from "@/lib/schedule";
import { ApiError, isUniqueViolation } from "./errors";
import type { DependencyCreate } from "./schemas";
import { cascadeProject, loadTasks, type Task } from "./tasks";

export type Dependency = typeof dependencies.$inferSelect;

export async function createDependency(
  db: Db,
  input: DependencyCreate,
): Promise<{ dependency: Dependency; tasks: Task[] }> {
  return db.transaction(async (tx) => {
    const [pred] = await tx.select().from(tasks).where(eq(tasks.id, input.predecessorId));
    const [succ] = await tx.select().from(tasks).where(eq(tasks.id, input.successorId));
    if (!pred || !succ) throw new ApiError(404, "not_found");
    if (pred.projectId !== succ.projectId) throw new ApiError(400, "cross_project");

    // Serialize dependency writes per project so concurrent A→B and B→A cannot both pass the cycle check.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${pred.projectId}))`);

    const existing = await tx
      .select()
      .from(dependencies)
      .where(eq(dependencies.projectId, pred.projectId));
    if (
      existing.some(
        (d) => d.predecessorId === pred.id && d.successorId === succ.id,
      )
    ) {
      throw new ApiError(409, "duplicate");
    }
    if (wouldCreateCycle(existing, pred.id, succ.id)) throw new ApiError(409, "cycle");

    let dependency: Dependency;
    try {
      [dependency] = await tx
        .insert(dependencies)
        .values({ projectId: pred.projectId, predecessorId: pred.id, successorId: succ.id })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) throw new ApiError(409, "duplicate");
      throw err;
    }
    const movedIds = await cascadeProject(tx, pred.projectId, [pred.id]);
    return { dependency, tasks: await loadTasks(tx, movedIds) };
  });
}

export async function deleteDependency(db: Db, id: string): Promise<void> {
  const rows = await db
    .delete(dependencies)
    .where(eq(dependencies.id, id))
    .returning({ id: dependencies.id });
  if (rows.length === 0) throw new ApiError(404, "not_found");
}
