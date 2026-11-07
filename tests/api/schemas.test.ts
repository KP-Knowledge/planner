import { describe, expect, it } from "vitest";
import {
  isoDate,
  projectCreate,
  taskCreate,
  taskPatch,
  teamCreate,
} from "@/server/schemas";

describe("schemas", () => {
  it("isoDate accepts real dates only", () => {
    expect(isoDate.safeParse("2026-02-28").success).toBe(true);
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
    expect(isoDate.safeParse("2026-2-3").success).toBe(false);
    expect(isoDate.safeParse("2026-13-01").success).toBe(false);
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
    const id = "00000000-0000-4000-8000-000000000000";
    expect(taskCreate.safeParse({ name: "x" }).success).toBe(false);
    expect(taskCreate.safeParse({ name: "x", sectionId: id }).success).toBe(true);
    expect(taskCreate.safeParse({ name: "x", parentId: id }).success).toBe(true);
  });
});
