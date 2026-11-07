import { describe, expect, it } from "vitest";
import { applyTaskUpdate, previewDrag, removeTask } from "@/features/gantt/optimistic";
import { cascade, moveTask } from "@/lib/schedule";
import type { Dependency } from "@/server/dependencies";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";

function task(id: string, startDate: string, endDate: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    sectionId: "s1",
    parentId: null,
    name: id,
    startDate,
    endDate,
    isMilestone: false,
    progress: 0,
    assigneeIds: [],
    sortOrder: 0,
    ...extra,
  } as Task;
}

function dep(predecessorId: string, successorId: string): Dependency {
  return { id: `${predecessorId}>${successorId}`, predecessorId, successorId } as Dependency;
}

function data(tasks: Task[], dependencies: Dependency[] = [], holidays: string[] = []): GanttData {
  return {
    tasks,
    dependencies,
    holidays: holidays.map((date) => ({ date, name: "h" })),
  } as unknown as GanttData;
}

const none = new Set<string>();

describe("applyTaskUpdate", () => {
  it("replaces only matching ids", () => {
    const a = task("a", "2026-04-01", "2026-04-02");
    const b = task("b", "2026-04-03", "2026-04-03");
    const d = data([a, b]);
    const next = applyTaskUpdate(d, [{ ...b, name: "B2" }]);
    expect(next.tasks[0]).toBe(a);
    expect(next.tasks[1].name).toBe("B2");
    expect(next).not.toBe(d);
  });

  it("ignores ids that are not in the data", () => {
    const d = data([task("a", "2026-04-01", "2026-04-02")]);
    expect(applyTaskUpdate(d, [task("zzz", "2026-04-01", "2026-04-01")]).tasks).toHaveLength(1);
  });
});

describe("removeTask", () => {
  it("drops the task, its subtasks and their dependencies", () => {
    const d = data(
      [task("a", "2026-04-01", "2026-04-01"), task("c", "2026-04-01", "2026-04-01", { parentId: "a" })],
      [dep("a", "b"), dep("x", "c"), dep("y", "z")],
    );
    const next = removeTask(d, "a");
    expect(next.tasks).toEqual([]);
    expect(next.dependencies.map((x) => x.id)).toEqual(["y>z"]);
  });
});

describe("previewDrag", () => {
  const chain = () =>
    data(
      [
        task("a", "2026-04-01", "2026-04-02"), // Wed-Thu
        task("b", "2026-04-03", "2026-04-03"), // Fri
        task("c", "2026-04-06", "2026-04-07"), // Mon-Tue
        task("free", "2026-04-01", "2026-04-01"),
      ],
      [dep("a", "b"), dep("b", "c")],
    );

  it("move returns the edited task plus the same cascade as the server", () => {
    const d = chain();
    const out = previewDrag(d, "a", "move", "2026-04-02", none);
    const edited = moveTask(d.tasks[0], "2026-04-02", none);
    expect(out[0]).toMatchObject({ id: "a", startDate: edited.startDate, endDate: edited.endDate });

    const expected = cascade(
      [edited, ...d.tasks.slice(1)],
      d.dependencies,
      ["a"],
      none,
    );
    expect(expected.length).toBeGreaterThan(0);
    const byId = new Map(out.map((t) => [t.id, t]));
    for (const e of expected) {
      expect(byId.get(e.id)).toMatchObject({ startDate: e.startDate, endDate: e.endDate });
    }
    expect(out).toHaveLength(1 + expected.length);
    expect(byId.has("free")).toBe(false);
  });

  it("keeps full Task fields on cascaded tasks", () => {
    const d = chain();
    const out = previewDrag(d, "a", "move", "2026-04-08", none);
    const b = out.find((t) => t.id === "b");
    expect(b).toBeDefined();
    expect(b?.name).toBe("b");
    expect(b?.sectionId).toBe("s1");
  });

  it("move snaps a weekend start to the next workday and keeps workday duration", () => {
    const d = data([task("a", "2026-04-01", "2026-04-02")]);
    const [a] = previewDrag(d, "a", "move", "2026-04-04", none); // Saturday
    expect(a.startDate).toBe("2026-04-06");
    expect(a.endDate).toBe("2026-04-07");
  });

  it("resize-end uses resizeTask and never goes before the start", () => {
    const d = data([task("a", "2026-04-01", "2026-04-02")]);
    expect(previewDrag(d, "a", "resize-end", "2026-04-08", none)[0]).toMatchObject({
      startDate: "2026-04-01",
      endDate: "2026-04-08",
    });
    expect(previewDrag(d, "a", "resize-end", "2026-03-20", none)[0].endDate).toBe("2026-04-01");
  });

  it("resize-start uses resizeTaskStart and clamps to the end", () => {
    const d = data([task("a", "2026-04-02", "2026-04-08")]);
    expect(previewDrag(d, "a", "resize-start", "2026-04-04", none)[0]).toMatchObject({
      startDate: "2026-04-06",
      endDate: "2026-04-08",
    });
    expect(previewDrag(d, "a", "resize-start", "2026-05-01", none)[0].startDate).toBe("2026-04-08");
  });

  it("a milestone only moves and stays one day", () => {
    const d = data([task("m", "2026-04-01", "2026-04-01", { isMilestone: true })]);
    const [m] = previewDrag(d, "m", "resize-end", "2026-04-10", none);
    expect(m.startDate).toBe("2026-04-01");
    expect(m.endDate).toBe("2026-04-01");
    const [moved] = previewDrag(d, "m", "move", "2026-04-09", none);
    expect(moved).toMatchObject({ startDate: "2026-04-09", endDate: "2026-04-09" });
  });

  it("returns nothing for an unknown task", () => {
    expect(previewDrag(data([]), "nope", "move", "2026-04-01", none)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const d = chain();
    const snapshot = JSON.stringify(d);
    previewDrag(d, "a", "move", "2026-04-10", none);
    expect(JSON.stringify(d)).toBe(snapshot);
  });

  it("Songkran: moving a predecessor into 13-15 Apr pushes the successor to 16 Apr or later", () => {
    const holidays = ["2026-04-13", "2026-04-14", "2026-04-15"];
    const d = data(
      [
        task("pred", "2026-04-08", "2026-04-09"), // Wed-Thu
        task("succ", "2026-04-10", "2026-04-10"), // Fri
      ],
      [dep("pred", "succ")],
      holidays,
    );
    const h = new Set(holidays);
    // Drop the predecessor's start onto the holiday block: 13 Apr (Mon).
    const out = previewDrag(d, "pred", "move", "2026-04-13", h);
    const pred = out.find((t) => t.id === "pred")!;
    const succ = out.find((t) => t.id === "succ")!;
    expect(pred.startDate).toBe("2026-04-16");
    expect(pred.endDate).toBe("2026-04-17");
    expect(succ.startDate >= "2026-04-20").toBe(true);

    // Drag so the predecessor ENDS right before the holidays (10 Apr): successor lands on 16 Apr.
    const out2 = previewDrag(d, "pred", "resize-end", "2026-04-10", h);
    const succ2 = out2.find((t) => t.id === "succ")!;
    expect(succ2.startDate).toBe("2026-04-16");
  });
});
