import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/db";
import { rejection, seedProject, seedTask } from "./helpers";
import type { Db } from "@/db/types";
import { dependencies, tasks } from "@/db/schema";
import { createDependency, deleteDependency } from "@/server/dependencies";
import { getGantt } from "@/server/projects";

describe("dependencies", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("create cascades the successor and returns { dependency, tasks }", async () => {
    const { project, section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-11");
    const b = await seedTask(db, section.id, "B", "2026-11-10", "2026-11-10");
    const { dependency, tasks: moved } = await createDependency(db, { predecessorId: a.id, successorId: b.id });
    expect(dependency).toMatchObject({ projectId: project.id, predecessorId: a.id, successorId: b.id });
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ id: b.id, startDate: "2026-11-12", endDate: "2026-11-12", assigneeIds: [] });
    expect((await getGantt(db, project.id)).dependencies).toHaveLength(1);
  });

  it("no tasks move when there is no collision", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const b = await seedTask(db, section.id, "B", "2026-11-12", "2026-11-12");
    const r = await createDependency(db, { predecessorId: a.id, successorId: b.id });
    expect(r.tasks).toEqual([]);
  });

  it("rejects cycle", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const b = await seedTask(db, section.id, "B", "2026-11-16", "2026-11-16");
    const c = await seedTask(db, section.id, "C", "2026-11-23", "2026-11-23");
    await createDependency(db, { predecessorId: a.id, successorId: b.id });
    await createDependency(db, { predecessorId: b.id, successorId: c.id });
    const r = await rejection(createDependency(db, { predecessorId: c.id, successorId: a.id }));
    expect(r).toEqual({ status: 409, code: "cycle" });
    expect(await db.select().from(dependencies)).toHaveLength(2);
    expect((await rejection(createDependency(db, { predecessorId: a.id, successorId: a.id }))).code).toBe("cycle");
  });

  it("409 duplicate", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const b = await seedTask(db, section.id, "B", "2026-11-16", "2026-11-16");
    await createDependency(db, { predecessorId: a.id, successorId: b.id });
    expect(await rejection(createDependency(db, { predecessorId: a.id, successorId: b.id }))).toEqual({
      status: 409,
      code: "duplicate",
    });
  });

  it("400 cross_project and 404 missing task", async () => {
    const { section } = await seedProject(db);
    const { section: other } = await seedProject(db, "Other");
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const x = await seedTask(db, other.id, "X", "2026-11-09", "2026-11-09");
    expect(await rejection(createDependency(db, { predecessorId: a.id, successorId: x.id }))).toEqual({
      status: 400,
      code: "cross_project",
    });
    expect(
      (await rejection(createDependency(db, { predecessorId: a.id, successorId: "00000000-0000-4000-8000-000000000000" })))
        .status,
    ).toBe(404);
  });

  it("delete removes only the dependency; tasks keep their dates", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-11");
    const b = await seedTask(db, section.id, "B", "2026-11-10", "2026-11-10");
    const { dependency } = await createDependency(db, { predecessorId: a.id, successorId: b.id });
    await deleteDependency(db, dependency.id);
    expect(await db.select().from(dependencies)).toHaveLength(0);
    expect(await db.select().from(tasks)).toHaveLength(2);
    expect((await rejection(deleteDependency(db, dependency.id))).status).toBe(404);
  });
});
