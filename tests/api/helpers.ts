import { createProject } from "@/server/projects";
import { createSection } from "@/server/sections";
import { createTask } from "@/server/tasks";
import type { Db } from "@/db/types";

export async function seedProject(db: Db, name = "P") {
  const project = await createProject(db, { name });
  const section = await createSection(db, { projectId: project.id, name: "S1" });
  return { project, section };
}

export async function seedTask(
  db: Db,
  sectionId: string,
  name: string,
  startDate: string,
  endDate: string,
  extra: { parentId?: string; isMilestone?: boolean } = {},
) {
  return createTask(db, { sectionId, name, startDate, endDate, ...extra });
}

export async function rejection(p: Promise<unknown>): Promise<{ status?: number; code?: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as { status?: number; code?: string };
    return { status: err.status, code: err.code };
  }
  throw new Error("expected promise to reject");
}
