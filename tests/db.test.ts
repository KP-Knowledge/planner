import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import { createTestDb } from "./helpers/db";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

async function seedProject() {
  const [project] = await db
    .insert(schema.projects)
    .values({ name: "P" })
    .returning();
  const [section] = await db
    .insert(schema.sections)
    .values({ projectId: project.id, name: "S", sortOrder: 0 })
    .returning();
  return { project, section };
}

describe("holidays", () => {
  it("rejects a duplicate global holiday on the same date", async () => {
    await db
      .insert(schema.holidays)
      .values({ date: "2026-12-31", name: "NYE", source: "seed" });
    await expect(
      db
        .insert(schema.holidays)
        .values({ date: "2026-12-31", name: "NYE again", source: "custom" }),
    ).rejects.toThrow();
  });

  it("allows the same date in different projects", async () => {
    const { project } = await seedProject();
    await db
      .insert(schema.holidays)
      .values({ date: "2026-12-31", name: "NYE", source: "seed" });
    await db.insert(schema.holidays).values({
      date: "2026-12-31",
      name: "Project day",
      source: "custom",
      projectId: project.id,
    });
  });
});

describe("tasks", () => {
  it("rejects endDate before startDate", async () => {
    const { project, section } = await seedProject();
    await expect(
      db.insert(schema.tasks).values({
        projectId: project.id,
        sectionId: section.id,
        name: "bad",
        startDate: "2026-04-10",
        endDate: "2026-04-09",
        sortOrder: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects progress outside 0..100", async () => {
    const { project, section } = await seedProject();
    await expect(
      db.insert(schema.tasks).values({
        projectId: project.id,
        sectionId: section.id,
        name: "bad",
        startDate: "2026-04-10",
        endDate: "2026-04-10",
        progress: 101,
        sortOrder: 0,
      }),
    ).rejects.toThrow();
  });

  it("sets tasks.teamId to null when the team is deleted", async () => {
    const { project, section } = await seedProject();
    const [team] = await db
      .insert(schema.teams)
      .values({ name: "T", color: "#4F46E5" })
      .returning();
    const [task] = await db
      .insert(schema.tasks)
      .values({
        projectId: project.id,
        sectionId: section.id,
        name: "t",
        startDate: "2026-04-10",
        endDate: "2026-04-10",
        teamId: team.id,
        sortOrder: 0,
      })
      .returning();
    await db.delete(schema.teams).where(eq(schema.teams.id, team.id));
    const [after] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, task.id));
    expect(after.teamId).toBeNull();
  });
});

describe("dependencies", () => {
  it("rejects a self dependency and duplicates", async () => {
    const { project, section } = await seedProject();
    const mk = async (name: string) =>
      (
        await db
          .insert(schema.tasks)
          .values({
            projectId: project.id,
            sectionId: section.id,
            name,
            startDate: "2026-04-10",
            endDate: "2026-04-10",
            sortOrder: 0,
          })
          .returning()
      )[0];
    const a = await mk("a");
    const b = await mk("b");
    await expect(
      db.insert(schema.dependencies).values({
        projectId: project.id,
        predecessorId: a.id,
        successorId: a.id,
      }),
    ).rejects.toThrow();
    const dep = {
      projectId: project.id,
      predecessorId: a.id,
      successorId: b.id,
    };
    await db.insert(schema.dependencies).values(dep);
    await expect(db.insert(schema.dependencies).values(dep)).rejects.toThrow();
  });
});
