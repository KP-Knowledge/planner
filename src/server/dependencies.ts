import { eq } from "drizzle-orm";
import { dependencies, tasks } from "@/db/schema";
import type { Db } from "@/db/types";
import { wouldCreateCycle } from "@/lib/schedule";
import { ApiError } from "./errors";
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

    const [dependency] = await tx
      .insert(dependencies)
      .values({ projectId: pred.projectId, predecessorId: pred.id, successorId: succ.id })
      .returning();
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
