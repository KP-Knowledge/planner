import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { rejection, seedProject, seedTask } from "./helpers";
import type { Db } from "@/db/types";
import { holidays, sections, tasks } from "@/db/schema";
import {
  createProject,
  deleteProject,
  getGantt,
  listProjects,
  reorder,
  updateProject,
} from "@/server/projects";
import { createSection, deleteSection, updateSection } from "@/server/sections";

describe("projects", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("create → list excludes archived unless asked", async () => {
    const a = await createProject(db, { name: "A" });
    const b = await createProject(db, { name: "B", description: "d" });
    await updateProject(db, b.id, { archived: true });
    expect((await listProjects(db, false)).map((p) => p.id)).toEqual([a.id]);
    expect((await listProjects(db, true)).map((p) => p.id)).toEqual([b.id]);
    const restored = await updateProject(db, b.id, { archived: false, name: "B2" });
    expect(restored.archivedAt).toBeNull();
    expect(restored.name).toBe("B2");
  });

  it("DELETE on non-archived → 409 not_archived", async () => {
    const p = await createProject(db, { name: "A" });
    expect(await rejection(deleteProject(db, p.id))).toEqual({ status: 409, code: "not_archived" });
    expect(await listProjects(db, false)).toHaveLength(1);
  });

  it("archive then DELETE removes project with sections and tasks", async () => {
    const { project, section } = await seedProject(db);
    await seedTask(db, section.id, "T", "2026-11-09", "2026-11-10");
    await updateProject(db, project.id, { archived: true });
    await deleteProject(db, project.id);
    expect(await listProjects(db, true)).toHaveLength(0);
    expect(await db.select().from(sections)).toHaveLength(0);
    expect(await db.select().from(tasks)).toHaveLength(0);
  });

  it("404 for missing project", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await rejection(updateProject(db, id, { name: "x" }))).status).toBe(404);
    expect((await rejection(deleteProject(db, id))).status).toBe(404);
    expect(await rejection(getGantt(db, id))).toEqual({ status: 404, code: "not_found" });
  });

  it("getGantt returns everything with assigneeIds and merged holidays", async () => {
    const { project, section } = await seedProject(db);
    const other = await createProject(db, { name: "Other" });
    await db.insert(holidays).values([
      { date: "2026-12-10", name: "org", projectId: null, source: "seed" },
      { date: "2026-12-11", name: "mine", projectId: project.id, source: "custom" },
      { date: "2026-12-12", name: "theirs", projectId: other.id, source: "custom" },
    ]);
    const t = await seedTask(db, section.id, "T", "2026-11-09", "2026-11-10");
    const g = await getGantt(db, project.id);
    expect(g.project.id).toBe(project.id);
    expect(g.sections).toHaveLength(1);
    expect(g.tasks).toHaveLength(1);
    expect(g.tasks[0]).toMatchObject({ id: t.id, assigneeIds: [] });
    expect(g.holidays.map((h) => h.name).sort()).toEqual(["mine", "org"]);
    expect(g.dependencies).toEqual([]);
    expect(g.teams).toEqual([]);
    expect(g.users).toEqual([]);
  });
});

describe("sections", () => {
  it("create appends sortOrder, update renames, delete cascades tasks", async () => {
    const db = await createTestDb();
    const { project, section } = await seedProject(db);
    const s2 = await createSection(db, { projectId: project.id, name: "S2" });
    expect(s2.sortOrder).toBe(section.sortOrder + 1);
    expect((await updateSection(db, s2.id, { name: "Renamed" })).name).toBe("Renamed");
    await seedTask(db, s2.id, "T", "2026-11-09", "2026-11-09");
    await deleteSection(db, s2.id);
    expect(await db.select().from(tasks)).toHaveLength(0);
    expect((await rejection(deleteSection(db, s2.id))).status).toBe(404);
    expect(
      (await rejection(createSection(db, { projectId: "00000000-0000-4000-8000-000000000000", name: "x" }))).status,
    ).toBe(404);
  });
});

describe("reorder", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("moving a task to another section moves its subtasks too", async () => {
    const { project, section: s1 } = await seedProject(db);
    const s2 = await createSection(db, { projectId: project.id, name: "S2" });
    const parent = await seedTask(db, s1.id, "Parent", "2026-11-09", "2026-11-10");
    const sub = await seedTask(db, s1.id, "Sub", "2026-11-09", "2026-11-09", { parentId: parent.id });
    const stay = await seedTask(db, s1.id, "Stay", "2026-11-09", "2026-11-09");

    await reorder(db, project.id, {
      sections: [
        { id: s2.id, taskIds: [parent.id] },
        { id: s1.id, taskIds: [stay.id] },
      ],
    });

    const rows = new Map((await db.select().from(tasks)).map((t) => [t.id, t]));
    expect(rows.get(parent.id)).toMatchObject({ sectionId: s2.id, sortOrder: 0 });
    expect(rows.get(sub.id)?.sectionId).toBe(s2.id);
    expect(rows.get(stay.id)).toMatchObject({ sectionId: s1.id, sortOrder: 0 });
    const secs = new Map((await db.select().from(sections)).map((s) => [s.id, s]));
    expect(secs.get(s2.id)?.sortOrder).toBe(0);
    expect(secs.get(s1.id)?.sortOrder).toBe(1);
  });

  it("reorders within a section", async () => {
    const { project, section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const b = await seedTask(db, section.id, "B", "2026-11-09", "2026-11-09");
    await reorder(db, project.id, { sections: [{ id: section.id, taskIds: [b.id, a.id] }] });
    const g = await getGantt(db, project.id);
    expect(g.tasks.map((t) => t.name)).toEqual(["B", "A"]);
  });

  it("400 when a section or task belongs to another project", async () => {
    const { project, section } = await seedProject(db);
    const { section: foreignSection } = await seedProject(db, "Other");
    const foreignTask = await seedTask(db, foreignSection.id, "F", "2026-11-09", "2026-11-09");
    expect((await rejection(reorder(db, project.id, { sections: [{ id: foreignSection.id, taskIds: [] }] }))).status).toBe(400);
    expect((await rejection(reorder(db, project.id, { sections: [{ id: section.id, taskIds: [foreignTask.id] }] }))).status).toBe(400);
    expect((await db.select().from(tasks).where(eq(tasks.id, foreignTask.id)))[0].sectionId).toBe(foreignSection.id);
  });

  it("400 when a subtask id is listed", async () => {
    const { project, section } = await seedProject(db);
    const p = await seedTask(db, section.id, "P", "2026-11-09", "2026-11-09");
    const s = await seedTask(db, section.id, "S", "2026-11-09", "2026-11-09", { parentId: p.id });
    expect((await rejection(reorder(db, project.id, { sections: [{ id: section.id, taskIds: [s.id] }] }))).status).toBe(400);
  });
});
