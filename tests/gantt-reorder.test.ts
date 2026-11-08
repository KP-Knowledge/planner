import { describe, expect, it } from "vitest";
import { applyOrder } from "@/features/gantt/optimistic";
import { addRowId, buildOrder } from "@/features/gantt/reorder";
import type { GanttData } from "@/server/projects";
import type { Section } from "@/server/sections";
import type { Task } from "@/server/tasks";

const section = (id: string, sortOrder: number) => ({ id, name: id, sortOrder }) as Section;
const task = (id: string, sectionId: string, sortOrder: number, parentId: string | null = null) =>
  ({ id, sectionId, sortOrder, parentId, name: id }) as Task;

const data = {
  sections: [section("s1", 0), section("s2", 1), section("s3", 2)],
  tasks: [
    task("a", "s1", 0),
    task("a1", "s1", 0, "a"),
    task("b", "s1", 1),
    task("c", "s2", 0),
    task("d", "s2", 1),
  ],
} as GanttData;

describe("buildOrder", () => {
  it("moves a task down within its section (lands after the target)", () => {
    expect(buildOrder(data, "a", "b")).toEqual([
      { id: "s1", taskIds: ["b", "a"] },
      { id: "s2", taskIds: ["c", "d"] },
      { id: "s3", taskIds: [] },
    ]);
  });

  it("moves a task up within its section (lands before the target)", () => {
    expect(buildOrder(data, "d", "c")?.[1]).toEqual({ id: "s2", taskIds: ["d", "c"] });
  });

  it("moves a task across sections, before the task it is dropped on", () => {
    expect(buildOrder(data, "b", "d")).toEqual([
      { id: "s1", taskIds: ["a"] },
      { id: "s2", taskIds: ["c", "b", "d"] },
      { id: "s3", taskIds: [] },
    ]);
  });

  it("drops on a section header at the start, on an add row at the end", () => {
    expect(buildOrder(data, "a", "s2")?.[1].taskIds).toEqual(["a", "c", "d"]);
    expect(buildOrder(data, "a", addRowId("s2"))?.[1].taskIds).toEqual(["c", "d", "a"]);
    expect(buildOrder(data, "a", addRowId("s3"))?.[2].taskIds).toEqual(["a"]);
  });

  it("moves to the end of its own section via the add row", () => {
    expect(buildOrder(data, "a", addRowId("s1"))?.[0].taskIds).toEqual(["b", "a"]);
    expect(buildOrder(data, "b", addRowId("s1"))).toBeNull();
  });

  it("treats a subtask drop target as its parent", () => {
    expect(buildOrder(data, "c", "a1")?.[0].taskIds).toEqual(["c", "a", "b"]);
  });

  it("subtasks follow their parent and are never listed", () => {
    const order = buildOrder(data, "a", "c")!;
    expect(order.flatMap((s) => s.taskIds)).not.toContain("a1");
    const next = applyOrder(data, order);
    expect(next.tasks.find((t) => t.id === "a1")?.sectionId).toBe("s2");
  });

  it("refuses to drag a subtask", () => {
    expect(buildOrder(data, "a1", "b")).toBeNull();
  });

  it("moves a section among sections, keeping its tasks", () => {
    expect(buildOrder(data, "s1", "s3")).toEqual([
      { id: "s2", taskIds: ["c", "d"] },
      { id: "s3", taskIds: [] },
      { id: "s1", taskIds: ["a", "b"] },
    ]);
    expect(buildOrder(data, "s3", "s1")?.map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
  });

  it("resolves a section dropped on a task or add row to that task's section", () => {
    expect(buildOrder(data, "s1", "c")?.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
    expect(buildOrder(data, "s1", addRowId("s3"))?.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
  });

  it("returns null for no-ops and unknown ids", () => {
    expect(buildOrder(data, "a", "a")).toBeNull();
    expect(buildOrder(data, "s1", "a")).toBeNull();
    expect(buildOrder(data, "a", "nope")).toBeNull();
    expect(buildOrder(data, "nope", "a")).toBeNull();
  });
});
