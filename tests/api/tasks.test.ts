import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../helpers/db";
import { rejection, seedProject, seedTask } from "./helpers";
import type { Db } from "@/db/types";
import { holidays, tasks } from "@/db/schema";
import { upsertUserFromProfile } from "@/server/users";
import { createDependency } from "@/server/dependencies";
import { createSection } from "@/server/sections";
import { createTeam } from "@/server/teams";
import { createTask, deleteTask, updateTask } from "@/server/tasks";

describe("createTask", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    // Only Date is faked: PGlite needs real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T10:00:00Z")); // Saturday
  });
  afterEach(() => vi.useRealTimers());

  it("defaults to today snapped to next workday, 1 workday long", async () => {
    const { project, section } = await seedProject(db);
    const t = await createTask(db, { sectionId: section.id, name: "New" });
    expect(t).toMatchObject({
      projectId: project.id,
      name: "New",
      startDate: "2026-11-09",
      endDate: "2026-11-09",
      progress: 0,
      isMilestone: false,
      assigneeIds: [],
    });
  });

  it("default start skips holidays", async () => {
    const { project, section } = await seedProject(db);
    await db.insert(holidays).values({ date: "2026-11-09", name: "h", projectId: project.id, source: "custom" });
    const t = await createTask(db, { sectionId: section.id, name: "x" });
    expect(t.startDate).toBe("2026-11-10");
  });

  it("uses Bangkok date near midnight UTC", async () => {
    vi.setSystemTime(new Date("2026-11-09T18:30:00Z")); // already Tue 11-10 in Bangkok
    const { section } = await seedProject(db);
    const t = await createTask(db, { sectionId: section.id, name: "x" });
    expect(t.startDate).toBe("2026-11-10");
  });

  it("milestone forces endDate = startDate; sortOrder is last + 1", async () => {
    const { section } = await seedProject(db);
    const a = await createTask(db, { sectionId: section.id, name: "a", startDate: "2026-11-10", endDate: "2026-11-12" });
    const m = await createTask(db, {
      sectionId: section.id, name: "m", startDate: "2026-11-10", endDate: "2026-11-12", isMilestone: true,
    });
    expect(m.endDate).toBe("2026-11-10");
    expect(m.sortOrder).toBe(a.sortOrder + 1);
  });

  it("400 when endDate < startDate", async () => {
    const { section } = await seedProject(db);
    const r = await rejection(createTask(db, { sectionId: section.id, name: "x", startDate: "2026-11-12", endDate: "2026-11-10" }));
    expect(r.status).toBe(400);
  });

  it("404 for missing section", async () => {
    expect(
      (await rejection(createTask(db, { sectionId: "00000000-0000-4000-8000-000000000000", name: "x" }))).status,
    ).toBe(404);
  });

  it("subtask derives section from parent; mismatching section → 400; nesting → 400", async () => {
    const { project, section } = await seedProject(db);
    const s2 = await createSection(db, { projectId: project.id, name: "S2" });
    const parent = await seedTask(db, section.id, "P", "2026-11-09", "2026-11-10");
    const sub = await createTask(db, { parentId: parent.id, name: "sub", startDate: "2026-11-09", endDate: "2026-11-09" });
    expect(sub).toMatchObject({ parentId: parent.id, sectionId: section.id, projectId: project.id });

    expect((await rejection(createTask(db, { parentId: parent.id, sectionId: s2.id, name: "x" }))).status).toBe(400);
    expect(await rejection(createTask(db, { parentId: sub.id, name: "deep" }))).toEqual({ status: 400, code: "nesting" });
    expect((await rejection(createTask(db, { name: "orphan" }))).status).toBe(400);
  });

  it("parent in another project → 400 cross_project", async () => {
    const { section } = await seedProject(db);
    const { section: other } = await seedProject(db, "Other");
    const foreign = await seedTask(db, other.id, "F", "2026-11-09", "2026-11-09");
    expect(await rejection(createTask(db, { sectionId: section.id, parentId: foreign.id, name: "x" }))).toEqual({
      status: 400,
      code: "cross_project",
    });
  });
});

describe("updateTask", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("PATCH predecessor endDate forward pushes successor (2 tasks)", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-10"); // Mon-Tue
    const b = await seedTask(db, section.id, "B", "2026-11-11", "2026-11-12"); // Wed-Thu
    const c = await seedTask(db, section.id, "C", "2026-11-20", "2026-11-20"); // untouched
    await createDependency(db, { predecessorId: a.id, successorId: b.id });
    await createDependency(db, { predecessorId: a.id, successorId: c.id });

    const { tasks: out } = await updateTask(db, a.id, { endDate: "2026-11-13" }); // Fri
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: a.id, endDate: "2026-11-13", assigneeIds: [] });
    // Sat/Sun skipped: B starts Mon 16, 2 workdays → Tue 17
    expect(out[1]).toMatchObject({ id: b.id, startDate: "2026-11-16", endDate: "2026-11-17" });

    const rows = await db.select().from(tasks);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(b.id)).toMatchObject({ startDate: "2026-11-16", endDate: "2026-11-17" });
    expect(byId.get(c.id)).toMatchObject({ startDate: "2026-11-20", endDate: "2026-11-20" });
  });

  it("cascade respects project holidays", async () => {
    const { project, section } = await seedProject(db);
    await db.insert(holidays).values({ date: "2026-11-12", name: "h", projectId: project.id, source: "custom" });
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-10");
    const b = await seedTask(db, section.id, "B", "2026-11-11", "2026-11-11");
    await createDependency(db, { predecessorId: a.id, successorId: b.id });
    const { tasks: out } = await updateTask(db, a.id, { endDate: "2026-11-11" });
    expect(out[1]).toMatchObject({ id: b.id, startDate: "2026-11-13", endDate: "2026-11-13" });
  });

  it("PATCH with endDate < startDate → 400 and nothing saved", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-10", "2026-11-12");
    expect((await rejection(updateTask(db, a.id, { endDate: "2026-11-09" }))).status).toBe(400);
    expect((await rejection(updateTask(db, a.id, { startDate: "2026-11-13" }))).status).toBe(400);
    const [row] = await db.select().from(tasks);
    expect(row).toMatchObject({ startDate: "2026-11-10", endDate: "2026-11-12" });
  });

  it("assigneeIds replaces the set", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const u1 = await upsertUserFromProfile(db, { sub: "1", name: "U1" });
    const u2 = await upsertUserFromProfile(db, { sub: "2", name: "U2" });
    const u3 = await upsertUserFromProfile(db, { sub: "3", name: "U3" });

    let r = await updateTask(db, a.id, { assigneeIds: [u1.id, u2.id] });
    expect([...r.tasks[0].assigneeIds].sort()).toEqual([u1.id, u2.id].sort());
    r = await updateTask(db, a.id, { assigneeIds: [u3.id, u3.id] });
    expect(r.tasks[0].assigneeIds).toEqual([u3.id]);
    r = await updateTask(db, a.id, { name: "renamed" });
    expect(r.tasks[0]).toMatchObject({ name: "renamed", assigneeIds: [u3.id] });
    r = await updateTask(db, a.id, { assigneeIds: [] });
    expect(r.tasks[0].assigneeIds).toEqual([]);
  });

  it("unknown assignee or team → 400 invalid_reference", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    const ghost = "00000000-0000-4000-8000-000000000000";
    expect(await rejection(updateTask(db, a.id, { assigneeIds: [ghost] }))).toEqual({ status: 400, code: "invalid_reference" });
    expect(await rejection(updateTask(db, a.id, { teamId: ghost }))).toEqual({ status: 400, code: "invalid_reference" });
  });

  it("sets and clears team, color, description; non-date patch does not cascade", async () => {
    const { section } = await seedProject(db);
    const team = await createTeam(db, { name: "T", color: "#10B981" });
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-10");
    const b = await seedTask(db, section.id, "B", "2026-11-09", "2026-11-09");
    await createDependency(db, { predecessorId: a.id, successorId: b.id }); // pushes B to 11-11
    const r = await updateTask(db, a.id, { teamId: team.id, color: "#EF4444", description: "d", progress: 40 });
    expect(r.tasks).toHaveLength(1);
    expect(r.tasks[0]).toMatchObject({ teamId: team.id, color: "#EF4444", description: "d", progress: 40 });
    const r2 = await updateTask(db, a.id, { teamId: null, color: null, description: null });
    expect(r2.tasks[0]).toMatchObject({ teamId: null, color: null, description: null });
  });

  it("making a task a milestone collapses it to its start date", async () => {
    const { section } = await seedProject(db);
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-12");
    const r = await updateTask(db, a.id, { isMilestone: true });
    expect(r.tasks[0]).toMatchObject({ isMilestone: true, startDate: "2026-11-09", endDate: "2026-11-09" });
    const r2 = await updateTask(db, a.id, { endDate: "2026-11-12" });
    expect(r2.tasks[0].endDate).toBe("2026-11-09");
  });

  it("404 for missing task", async () => {
    expect((await rejection(updateTask(db, "00000000-0000-4000-8000-000000000000", { name: "x" }))).status).toBe(404);
    expect((await rejection(deleteTask(db, "00000000-0000-4000-8000-000000000000"))).status).toBe(404);
  });

  it("deleteTask removes it and its subtasks", async () => {
    const { section } = await seedProject(db);
    const p = await seedTask(db, section.id, "P", "2026-11-09", "2026-11-09");
    await seedTask(db, section.id, "S", "2026-11-09", "2026-11-09", { parentId: p.id });
    await deleteTask(db, p.id);
    expect(await db.select().from(tasks)).toHaveLength(0);
  });
});
