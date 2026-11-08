import { describe, expect, it } from "vitest";
import {
  holidayCreate,
  holidayListQuery,
  holidayPatch,
  isoDate,
  projectCreate,
  taskCreate,
  taskPatch,
  teamCreate,
} from "@/server/schemas";

const id = "00000000-0000-4000-8000-000000000000";

describe("schemas", () => {
  it("isoDate accepts real dates only", () => {
    expect(isoDate.safeParse("2026-02-28").success).toBe(true);
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
    expect(isoDate.safeParse("2026-2-3").success).toBe(false);
    expect(isoDate.safeParse("2026-13-01").success).toBe(false);
  });

  it("dates are bounded to years 2000..2100 for tasks and holidays", () => {
    for (const bad of ["1999-12-31", "2101-01-01"]) {
      expect(isoDate.safeParse(bad).success).toBe(false);
      expect(taskPatch.safeParse({ startDate: bad }).success).toBe(false);
      expect(taskPatch.safeParse({ endDate: bad }).success).toBe(false);
      expect(
        taskCreate.safeParse({ name: "x", sectionId: id, startDate: bad }).success,
      ).toBe(false);
      expect(holidayCreate.safeParse({ date: bad, name: "h" }).success).toBe(false);
      expect(holidayPatch.safeParse({ date: bad }).success).toBe(false);
    }
    for (const ok of ["2000-01-01", "2100-12-31"]) {
      expect(isoDate.safeParse(ok).success).toBe(true);
      expect(taskPatch.safeParse({ startDate: ok, endDate: ok }).success).toBe(true);
      expect(holidayCreate.safeParse({ date: ok, name: "h" }).success).toBe(true);
      expect(holidayPatch.safeParse({ date: ok }).success).toBe(true);
    }
    expect(holidayListQuery.safeParse({ year: "1999" }).success).toBe(false);
    expect(holidayListQuery.safeParse({ year: "2101" }).success).toBe(false);
    expect(holidayListQuery.safeParse({ year: "2000" }).success).toBe(true);
    expect(holidayListQuery.safeParse({ year: "2100" }).success).toBe(true);
  });

  it("names are trimmed, 1..200", () => {
    expect(projectCreate.parse({ name: "  hi " }).name).toBe("hi");
    expect(projectCreate.safeParse({ name: "   " }).success).toBe(false);
    expect(projectCreate.safeParse({ name: "x".repeat(201) }).success).toBe(false);
  });

  it("colors are 6-digit hex", () => {
    expect(teamCreate.safeParse({ name: "t", color: "#4F46E5" }).success).toBe(true);
    expect(teamCreate.safeParse({ name: "t", color: "#4F46E" }).success).toBe(false);
    expect(teamCreate.safeParse({ name: "t", color: "red" }).success).toBe(false);
  });

  it("progress is an int 0..100", () => {
    expect(taskPatch.safeParse({ progress: 100 }).success).toBe(true);
    expect(taskPatch.safeParse({ progress: 101 }).success).toBe(false);
    expect(taskPatch.safeParse({ progress: -1 }).success).toBe(false);
    expect(taskPatch.safeParse({ progress: 1.5 }).success).toBe(false);
  });

  it("taskCreate needs sectionId or parentId", () => {
    expect(taskCreate.safeParse({ name: "x" }).success).toBe(false);
    expect(taskCreate.safeParse({ name: "x", sectionId: id }).success).toBe(true);
    expect(taskCreate.safeParse({ name: "x", parentId: id }).success).toBe(true);
  });
});
