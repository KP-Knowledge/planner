import { eq, max } from "drizzle-orm";
import { projects, sections } from "@/db/schema";
import type { Db } from "@/db/types";
import { ApiError } from "./errors";
import type { SectionCreate, SectionPatch } from "./schemas";

export type Section = typeof sections.$inferSelect;

export async function createSection(db: Db, input: SectionCreate): Promise<Section> {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, input.projectId));
    if (!project) throw new ApiError(404, "not_found");
    const [{ last }] = await tx
      .select({ last: max(sections.sortOrder) })
      .from(sections)
      .where(eq(sections.projectId, input.projectId));
    const [row] = await tx
      .insert(sections)
      .values({ projectId: input.projectId, name: input.name, sortOrder: (last ?? -1) + 1 })
      .returning();
    return row;
  });
}

export async function updateSection(db: Db, id: string, patch: SectionPatch): Promise<Section> {
  if (patch.name === undefined) {
    const [row] = await db.select().from(sections).where(eq(sections.id, id));
    if (!row) throw new ApiError(404, "not_found");
    return row;
  }
  const [row] = await db
    .update(sections)
    .set({ name: patch.name })
    .where(eq(sections.id, id))
    .returning();
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

export async function deleteSection(db: Db, id: string): Promise<void> {
  const rows = await db.delete(sections).where(eq(sections.id, id)).returning({ id: sections.id });
  if (rows.length === 0) throw new ApiError(404, "not_found");
}
