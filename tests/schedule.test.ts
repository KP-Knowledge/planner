import { describe, expect, it } from "vitest";
import {
  cascade,
  moveTask,
  resizeTask,
  resizeTaskStart,
  wouldCreateCycle,
  workdayDuration,
  type Dep,
  type SchedTask,
} from "@/lib/schedule";

const TH = new Set(["2026-04-13", "2026-04-14", "2026-04-15"]);
const H = new Set(["2026-04-06", "2026-04-13", "2026-04-14", "2026-04-15"]);

const t = (id: string, startDate: string, endDate: string): SchedTask => ({
  id,
  startDate,
  endDate,
});

describe("workdayDuration", () => {
  it("counts workdays inclusive", () => {
    expect(workdayDuration(t("a", "2026-04-10", "2026-04-17"), TH)).toBe(3);
  });

  it("is at least 1 for a task entirely on non-workdays", () => {
    expect(workdayDuration(t("a", "2026-04-11", "2026-04-12"), TH)).toBe(1);
  });
});

describe("moveTask", () => {
  it("moveTask snaps to workday", () => {
    expect(moveTask(t("a", "2026-04-08", "2026-04-09"), "2026-04-11", TH)).toEqual(
      t("a", "2026-04-16", "2026-04-17"),
    );
  });

  it("keeps workday duration across a weekend", () => {
    expect(moveTask(t("a", "2026-04-08", "2026-04-09"), "2026-04-10", TH)).toEqual(
      t("a", "2026-04-10", "2026-04-16"),
    );
  });

  it("keeps a 1-day task at 1 day", () => {
    expect(moveTask(t("a", "2026-04-08", "2026-04-08"), "2026-04-12", TH)).toEqual(
      t("a", "2026-04-16", "2026-04-16"),
    );
  });
});

describe("resizeTask", () => {
  it("sets the end date", () => {
    expect(resizeTask(t("a", "2026-04-08", "2026-04-09"), "2026-04-10", TH)).toEqual(
      t("a", "2026-04-08", "2026-04-10"),
    );
  });

  it("clamps an end before start to start", () => {
    expect(resizeTask(t("a", "2026-04-08", "2026-04-09"), "2026-04-01", TH)).toEqual(
      t("a", "2026-04-08", "2026-04-08"),
    );
  });

  it("moves an end dropped on Saturday back to Friday", () => {
    expect(resizeTask(t("a", "2026-04-08", "2026-04-09"), "2026-04-11", TH)).toEqual(
      t("a", "2026-04-08", "2026-04-10"),
    );
  });

  it("does not move the end before start when the range is all non-workdays", () => {
    expect(resizeTask(t("a", "2026-04-11", "2026-04-11"), "2026-04-12", TH)).toEqual(
      t("a", "2026-04-11", "2026-04-11"),
    );
  });
});

describe("resizeTaskStart", () => {
  it("snaps the new start to the next workday and keeps the end", () => {
    expect(resizeTaskStart(t("a", "2026-04-08", "2026-04-20"), "2026-04-11", TH)).toEqual(
      t("a", "2026-04-16", "2026-04-20"),
    );
  });

  it("clamps the start to the end date", () => {
    expect(resizeTaskStart(t("a", "2026-04-08", "2026-04-10"), "2026-04-20", TH)).toEqual(
      t("a", "2026-04-10", "2026-04-10"),
    );
  });

  it("allows an earlier start", () => {
    expect(resizeTaskStart(t("a", "2026-04-08", "2026-04-10"), "2026-04-07", TH)).toEqual(
      t("a", "2026-04-07", "2026-04-10"),
    );
  });
});

describe("cascade", () => {
  const chainDeps: Dep[] = [
    { predecessorId: "a", successorId: "b" },
    { predecessorId: "b", successorId: "c" },
    { predecessorId: "a", successorId: "d" },
  ];

  it("cascade multi-level", () => {
    const tasks = [
      t("a", "2026-04-01", "2026-04-07"),
      t("b", "2026-04-07", "2026-04-09"),
      t("c", "2026-04-10", "2026-04-10"),
      t("d", "2026-04-27", "2026-04-28"),
    ];
    const result = cascade(tasks, chainDeps, ["a"], H);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(t("b", "2026-04-08", "2026-04-10"));
    expect(result).toContainEqual(t("c", "2026-04-16", "2026-04-16"));
  });

  it("returns an empty list when A moves backward", () => {
    const tasks = [
      t("a", "2026-04-01", "2026-04-02"),
      t("b", "2026-04-07", "2026-04-09"),
      t("c", "2026-04-10", "2026-04-10"),
      t("d", "2026-04-27", "2026-04-28"),
    ];
    expect(cascade(tasks, chainDeps, ["a"], H)).toEqual([]);
  });

  it("does not return the changed task itself", () => {
    const tasks = [t("a", "2026-04-01", "2026-04-07"), t("b", "2026-04-20", "2026-04-21")];
    expect(cascade(tasks, [{ predecessorId: "a", successorId: "b" }], ["a"], H)).toEqual([]);
  });

  it("uses the latest required start when a task has several predecessors", () => {
    const tasks = [
      t("a", "2026-04-01", "2026-04-07"),
      t("b", "2026-04-01", "2026-04-09"),
      t("c", "2026-04-02", "2026-04-02"),
    ];
    const deps: Dep[] = [
      { predecessorId: "a", successorId: "c" },
      { predecessorId: "b", successorId: "c" },
    ];
    expect(cascade(tasks, deps, ["a", "b"], H)).toEqual([t("c", "2026-04-10", "2026-04-10")]);
  });

  it("pushes the successor to the next workday when the predecessor ends on a holiday", () => {
    const tasks = [t("a", "2026-04-13", "2026-04-14"), t("b", "2026-04-14", "2026-04-14")];
    expect(cascade(tasks, [{ predecessorId: "a", successorId: "b" }], ["a"], TH)).toEqual([
      t("b", "2026-04-16", "2026-04-16"),
    ]);
  });

  it("cascades across a month boundary", () => {
    const tasks = [t("a", "2026-04-28", "2026-04-30"), t("b", "2026-04-29", "2026-04-30")];
    expect(cascade(tasks, [{ predecessorId: "a", successorId: "b" }], ["a"], TH)).toEqual([
      t("b", "2026-05-01", "2026-05-04"),
    ]);
  });

  it("terminates on a cycle", () => {
    const tasks = [t("a", "2026-04-07", "2026-04-08"), t("b", "2026-04-07", "2026-04-08")];
    const deps: Dep[] = [
      { predecessorId: "a", successorId: "b" },
      { predecessorId: "b", successorId: "a" },
    ];
    expect(() => cascade(tasks, deps, ["a"], H)).not.toThrow();
  });
});

describe("wouldCreateCycle", () => {
  const deps: Dep[] = [
    { predecessorId: "a", successorId: "b" },
    { predecessorId: "b", successorId: "c" },
  ];

  it("detects a closing edge", () => {
    expect(wouldCreateCycle(deps, "c", "a")).toBe(true);
  });

  it("detects a self edge", () => {
    expect(wouldCreateCycle(deps, "a", "a")).toBe(true);
  });

  it("allows a forward edge", () => {
    expect(wouldCreateCycle(deps, "a", "c")).toBe(false);
  });
});
