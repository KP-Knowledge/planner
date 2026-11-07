import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { holidays } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  createHoliday,
  deleteHoliday,
  ensureSeeded,
  importThaiHolidays,
  listHolidays,
  updateHoliday,
} from "@/server/holidays";
import { getHolidaySet } from "@/server/holidaySet";
import { createTestDb } from "../helpers/db";
import { rejection, seedProject } from "./helpers";

const MISSING = "00000000-0000-4000-8000-000000000000";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function seedRows(year: number) {
  const rows = await db.select().from(holidays).where(eq(holidays.source, "seed"));
  return rows.filter((r) => r.date.startsWith(`${year}-`));
}

describe("importThaiHolidays", () => {
  it("inserts 2026 public holidays including 2026-04-13, then 0 on re-run", async () => {
    expect(await importThaiHolidays(db, 2026)).toEqual({ inserted: 18 });
    const rows = await seedRows(2026);
    expect(rows).toHaveLength(18);
    expect(rows.map((r) => r.date)).toContain("2026-04-13");
    expect(rows.every((r) => r.projectId === null && r.source === "seed")).toBe(true);
    expect(await importThaiHolidays(db, 2026)).toEqual({ inserted: 0 });
  });

  it("stores Thai names", async () => {
    await importThaiHolidays(db, 2026);
    const [row] = await db.select().from(holidays).where(eq(holidays.date, "2026-01-01"));
    expect(row.name).toMatch(/[\u0E00-\u0E7F]/);
  });

  it("rejects years outside 2000..2100 with 400", async () => {
    expect((await rejection(importThaiHolidays(db, 1999))).status).toBe(400);
    expect((await rejection(importThaiHolidays(db, 2101))).status).toBe(400);
    expect((await rejection(importThaiHolidays(db, 2026.5))).status).toBe(400);
  });
});

describe("ensureSeeded", () => {
  it("seeds years that have no seed rows", async () => {
    await ensureSeeded(db, [2026, 2027]);
    expect(await seedRows(2026)).toHaveLength(18);
    expect((await seedRows(2027)).length).toBeGreaterThan(0);
  });

  it("does not re-add a deleted seed row", async () => {
    await ensureSeeded(db, [2026]);
    await db.delete(holidays).where(eq(holidays.date, "2026-04-13"));
    await ensureSeeded(db, [2026]);
    expect(await seedRows(2026)).toHaveLength(17);
  });

  it("custom rows alone do not count as seeded", async () => {
    await createHoliday(db, { date: "2026-03-04", name: "x" });
    await ensureSeeded(db, [2026]);
    expect(await seedRows(2026)).toHaveLength(18);
  });
});

describe("listHolidays / createHoliday", () => {
  it("project holiday coexists with org holiday on the same date", async () => {
    await importThaiHolidays(db, 2026);
    const { project } = await seedProject(db);
    const created = await createHoliday(db, {
      date: "2026-04-13",
      name: "Company day",
      projectId: project.id,
    });
    expect(created.source).toBe("custom");
    const rows = await listHolidays(db, { year: 2026, projectId: project.id });
    expect(rows.filter((r) => r.date === "2026-04-13")).toHaveLength(2);
  });

  it("returns org rows only without projectId, ordered by date, scoped to year", async () => {
    await importThaiHolidays(db, 2026);
    await importThaiHolidays(db, 2027);
    const { project } = await seedProject(db);
    await createHoliday(db, { date: "2026-02-02", name: "P", projectId: project.id });
    const orgOnly = await listHolidays(db, { year: 2026 });
    expect(orgOnly).toHaveLength(18);
    expect(orgOnly.every((r) => r.date.startsWith("2026-"))).toBe(true);
    const dates = orgOnly.map((r) => r.date);
    expect(dates).toEqual([...dates].sort());
    expect(await listHolidays(db, { year: 2026, projectId: project.id })).toHaveLength(19);
  });

  it("excludes other projects' rows", async () => {
    const a = await seedProject(db, "A");
    const b = await seedProject(db, "B");
    await createHoliday(db, { date: "2026-02-02", name: "A", projectId: a.project.id });
    expect(await listHolidays(db, { year: 2026, projectId: b.project.id })).toHaveLength(0);
  });

  it("duplicate org date and duplicate project date → 409 duplicate", async () => {
    await createHoliday(db, { date: "2026-05-05", name: "x" });
    expect(await rejection(createHoliday(db, { date: "2026-05-05", name: "y" }))).toEqual({
      status: 409,
      code: "duplicate",
    });
    const { project } = await seedProject(db);
    await createHoliday(db, { date: "2026-05-05", name: "p", projectId: project.id });
    expect(
      await rejection(createHoliday(db, { date: "2026-05-05", name: "q", projectId: project.id })),
    ).toEqual({ status: 409, code: "duplicate" });
  });

  it("unknown project → 404 not_found", async () => {
    expect(
      await rejection(createHoliday(db, { date: "2026-05-05", name: "x", projectId: MISSING })),
    ).toEqual({ status: 404, code: "not_found" });
  });

  it("getHolidaySet contains both org and project dates", async () => {
    await createHoliday(db, { date: "2026-04-13", name: "org" });
    const { project } = await seedProject(db);
    await createHoliday(db, { date: "2026-04-20", name: "proj", projectId: project.id });
    const other = await seedProject(db, "other");
    const set = await getHolidaySet(db, project.id);
    expect(set.has("2026-04-13")).toBe(true);
    expect(set.has("2026-04-20")).toBe(true);
    expect((await getHolidaySet(db, other.project.id)).has("2026-04-20")).toBe(false);
  });
});

describe("updateHoliday / deleteHoliday", () => {
  it("renames and changes date; seed rows stay source seed", async () => {
    await importThaiHolidays(db, 2026);
    const [seed] = await db.select().from(holidays).where(eq(holidays.date, "2026-04-13"));
    const updated = await updateHoliday(db, seed.id, { name: "renamed", date: "2026-04-18" });
    expect(updated).toMatchObject({ name: "renamed", date: "2026-04-18", source: "seed" });
  });

  it("date change into a conflict → 409 duplicate", async () => {
    const a = await createHoliday(db, { date: "2026-06-01", name: "a" });
    await createHoliday(db, { date: "2026-06-02", name: "b" });
    expect(await rejection(updateHoliday(db, a.id, { date: "2026-06-02" }))).toEqual({
      status: 409,
      code: "duplicate",
    });
  });

  it("empty patch returns the row; missing → 404", async () => {
    const a = await createHoliday(db, { date: "2026-06-01", name: "a" });
    expect(await updateHoliday(db, a.id, {})).toEqual(a);
    expect((await rejection(updateHoliday(db, MISSING, { name: "z" }))).status).toBe(404);
  });

  it("deletes; missing → 404", async () => {
    const a = await createHoliday(db, { date: "2026-06-01", name: "a" });
    await deleteHoliday(db, a.id);
    expect(await db.select().from(holidays).where(eq(holidays.id, a.id))).toHaveLength(0);
    expect((await rejection(deleteHoliday(db, a.id))).status).toBe(404);
  });
});
