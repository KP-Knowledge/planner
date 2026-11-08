import { describe, expect, it } from "vitest";
import { initials } from "@/features/gantt/avatar";
import {
  AVATAR_SIZE,
  AVATAR_STEP,
  MILESTONE_HALF,
  PX_PER_DAY,
  ROW_HEIGHT,
  avatarStackWidth,
  barGeometry,
  childCounts,
  dateToX,
  dependencyPath,
  firstSundayX,
  headerSegments,
  nonWorkingDays,
  splitAvatars,
  taskGeometry,
  timelineRange,
  todayHighlight,
  visibleRows,
  weekStart,
  xToDate,
} from "@/features/gantt/layout";
import type { GanttData } from "@/server/projects";
import type { Section } from "@/server/sections";
import type { Task } from "@/server/tasks";

function section(id: string, sortOrder: number): Section {
  return { id, name: id, sortOrder, projectId: "p" } as Section;
}

function task(
  id: string,
  sectionId: string,
  sortOrder: number,
  extra: Partial<Task> = {},
): Task {
  return {
    id,
    sectionId,
    sortOrder,
    parentId: null,
    name: id,
    startDate: "2026-04-01",
    endDate: "2026-04-02",
    isMilestone: false,
    assigneeIds: [],
    ...extra,
  } as Task;
}

function data(sections: Section[], tasks: Task[]): GanttData {
  return { sections, tasks } as GanttData;
}

const ids = (rows: ReturnType<typeof visibleRows>) =>
  rows.map((r) =>
    r.kind === "section" ? `S:${r.section.id}` : r.kind === "add" ? `A:${r.sectionId}` : `${r.depth}:${r.task.id}`,
  );

describe("geometry", () => {
  it("dateToX / xToDate", () => {
    expect(dateToX("2026-04-03", "2026-04-01", "day")).toBe(72);
    expect(dateToX("2026-04-03", "2026-04-01", "week")).toBe(2 * PX_PER_DAY.week);
    expect(dateToX("2026-03-30", "2026-04-01", "day")).toBe(-72);
    expect(xToDate(73, "2026-04-01", "day")).toBe("2026-04-03");
    expect(xToDate(72, "2026-04-01", "day")).toBe("2026-04-03");
    expect(xToDate(71, "2026-04-01", "day")).toBe("2026-04-02");
    expect(xToDate(-1, "2026-04-01", "day")).toBe("2026-03-31");
  });

  it("barGeometry width is inclusive days × px", () => {
    const one = { startDate: "2026-04-01", endDate: "2026-04-01" };
    expect(barGeometry(one, "2026-04-01", "week")).toEqual({ x: 0, width: 16 });
    const three = { startDate: "2026-04-03", endDate: "2026-04-05" };
    expect(barGeometry(three, "2026-04-01", "day")).toEqual({ x: 72, width: 108 });
    expect(barGeometry(three, "2026-04-01", "month").width).toBe(12);
  });

  it("taskGeometry centers milestones on their day", () => {
    const m = { startDate: "2026-04-03", endDate: "2026-04-03", isMilestone: true };
    const g = taskGeometry(m, "2026-04-01", "day");
    expect(g.x + g.width / 2).toBe(72 + 18);
    expect(g.width).toBe(MILESTONE_HALF * 2);
    const bar = { ...m, isMilestone: false };
    expect(taskGeometry(bar, "2026-04-01", "day")).toEqual(barGeometry(bar, "2026-04-01", "day"));
  });
});

describe("visibleRows", () => {
  const sections = [section("b", 1), section("a", 0)];
  const tasks = [
    task("a2", "a", 1),
    task("a1", "a", 0),
    task("a1-2", "a", 1, { parentId: "a1" }),
    task("a1-1", "a", 0, { parentId: "a1" }),
    task("b1", "b", 0),
  ];

  it("editable adds an add-row at the end of each expanded section", () => {
    const rows = visibleRows(data(sections, tasks), new Set(["b"]), { editable: true });
    expect(ids(rows).filter((r) => r.startsWith("A:"))).toEqual(["A:a"]);
    expect(ids(rows).at(-1)).toBe("S:b");
  });

  it("orders by section then task sortOrder with subtasks after parent", () => {
    expect(ids(visibleRows(data(sections, tasks), new Set()))).toEqual([
      "S:a",
      "0:a1",
      "1:a1-1",
      "1:a1-2",
      "0:a2",
      "S:b",
      "0:b1",
    ]);
  });

  it("hides subtasks of a collapsed parent", () => {
    expect(ids(visibleRows(data(sections, tasks), new Set(["a1"])))).toEqual([
      "S:a",
      "0:a1",
      "0:a2",
      "S:b",
      "0:b1",
    ]);
  });

  it("hides tasks of a collapsed section", () => {
    expect(ids(visibleRows(data(sections, tasks), new Set(["a"])))).toEqual(["S:a", "S:b", "0:b1"]);
  });

  it("returns only section rows for sections without tasks", () => {
    expect(ids(visibleRows(data([section("x", 0)], []), new Set()))).toEqual(["S:x"]);
  });
});

describe("dependencyPath", () => {
  const from = { x: 100, width: 50, row: 1 };

  it("starts at predecessor right edge and ends at successor left edge", () => {
    const d = dependencyPath(from, { x: 300, row: 4 });
    const sy = 1 * ROW_HEIGHT + ROW_HEIGHT / 2;
    const ey = 4 * ROW_HEIGHT + ROW_HEIGHT / 2;
    expect(d.startsWith(`M150 ${sy}`)).toBe(true);
    expect(d.endsWith(`V${ey} H300`)).toBe(true);
    expect(d).toContain("H158");
  });

  it("routes around when the successor starts before the predecessor ends", () => {
    const up = dependencyPath(from, { x: 120, row: 0 });
    const sy = ROW_HEIGHT + ROW_HEIGHT / 2;
    const ey = ROW_HEIGHT / 2;
    expect(up.startsWith(`M150 ${sy}`)).toBe(true);
    expect(up.endsWith(`V${ey} H120`)).toBe(true);
    // goes up to the row boundary, then left of the successor
    expect(up).toContain(`V${ROW_HEIGHT} H112`);

    const down = dependencyPath(from, { x: 120, row: 2 });
    expect(down).toContain(`V${2 * ROW_HEIGHT} H112`);
    expect(down.endsWith(`V${2 * ROW_HEIGHT + ROW_HEIGHT / 2} H120`)).toBe(true);
  });
});

describe("timelineRange", () => {
  it("pads min start / max end", () => {
    const r = timelineRange(
      [
        { startDate: "2026-04-10", endDate: "2026-04-12" },
        { startDate: "2026-04-05", endDate: "2026-04-06" },
        { startDate: "2026-04-20", endDate: "2026-05-01" },
      ],
      "2026-04-15",
    );
    expect(r).toEqual({ origin: "2026-03-22", end: "2026-05-31" });
  });

  it("falls back to today when empty", () => {
    const r = timelineRange([], "2026-04-15");
    expect(r.origin).toBe("2026-04-01");
    expect(r.end > "2026-04-15").toBe(true);
  });
});

describe("weekStart", () => {
  it("returns the Sunday on or before the date", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-08");
    expect(weekStart("2026-11-09")).toBe("2026-11-08");
    expect(weekStart("2026-11-14")).toBe("2026-11-08");
    expect(weekStart("2027-01-01")).toBe("2026-12-27");
  });
});

describe("headerSegments", () => {
  const sum = (s: { width: number }[]) => s.reduce((a, c) => a + c.width, 0);

  it("day zoom: months on top, one cell per day", () => {
    const { top, bottom } = headerSegments("2026-03-30", "2026-04-02", "day");
    expect(top.map((c) => [c.date, c.width])).toEqual([
      ["2026-03-30", 2 * 36],
      ["2026-04-01", 2 * 36],
    ]);
    expect(bottom).toHaveLength(4);
    expect(sum(bottom)).toBe(4 * 36);
  });

  it("week zoom: clips first and last week, weeks start on Sunday", () => {
    const { bottom } = headerSegments("2026-04-01", "2026-04-14", "week");
    expect(bottom.map((c) => [c.date, c.days])).toEqual([
      ["2026-04-01", 4],
      ["2026-04-05", 7],
      ["2026-04-12", 3],
    ]);
    expect(bottom.map((c) => c.x)).toEqual([0, 4 * 16, 11 * 16]);
  });

  it("week zoom: a range starting on Sunday has no clipped first week", () => {
    const { bottom } = headerSegments("2026-11-08", "2026-11-21", "week");
    expect(bottom.map((c) => [c.date, c.days])).toEqual([
      ["2026-11-08", 7],
      ["2026-11-15", 7],
    ]);
  });

  it("month zoom: years on top, months on the bottom", () => {
    const { top, bottom } = headerSegments("2026-11-15", "2027-02-10", "month");
    expect(top.map((c) => [c.date, c.days])).toEqual([
      ["2026-11-15", 47],
      ["2027-01-01", 41],
    ]);
    expect(bottom.map((c) => c.date)).toEqual([
      "2026-11-15",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
    expect(sum(top)).toBe(sum(bottom));
  });
});

describe("nonWorkingDays", () => {
  it("returns weekends and holidays with names", () => {
    const names = new Map([["2026-04-06", ["Chakri Memorial Day"]]]);
    const days = nonWorkingDays("2026-04-03", "2026-04-07", names);
    expect(days).toEqual([
      { date: "2026-04-04", weekend: true, holidays: [] },
      { date: "2026-04-05", weekend: true, holidays: [] },
      { date: "2026-04-06", weekend: false, holidays: ["Chakri Memorial Day"] },
    ]);
  });
});

describe("avatars", () => {
  it("splitAvatars shows at most 3 then the remainder", () => {
    expect(splitAvatars([1, 2, 3])).toEqual({ shown: [1, 2, 3], extra: 0 });
    expect(splitAvatars([1, 2, 3, 4, 5])).toEqual({ shown: [1, 2, 3], extra: 2 });
    expect(splitAvatars([])).toEqual({ shown: [], extra: 0 });
  });
});

describe("avatar stack and initials", () => {
  it("avatarStackWidth caps at 3 and adds a +N slot", () => {
    expect(avatarStackWidth(0)).toBe(0);
    expect(avatarStackWidth(1)).toBe(AVATAR_SIZE);
    expect(avatarStackWidth(3)).toBe(2 * AVATAR_STEP + AVATAR_SIZE);
    expect(avatarStackWidth(9)).toBe(3 * AVATAR_STEP + AVATAR_SIZE);
  });

  it("initials", () => {
    expect(initials({ name: "Ada Lovelace", email: null })).toBe("AL");
    expect(initials({ name: "ada", email: null })).toBe("A");
    expect(initials({ name: null, email: "bob@example.com" })).toBe("B");
    expect(initials({ name: "เกด สุข", email: null })).toBe("กส");
    expect(initials({ name: null, email: null })).toBe("?");
  });
});

describe("childCounts", () => {
  it("counts section tasks (subtasks included) and subtasks per parent", () => {
    const counts = childCounts(
      data([], [task("a1", "a", 0), task("a1-1", "a", 0, { parentId: "a1" }), task("b1", "b", 0)]),
    );
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("a1")).toBe(1);
    expect(counts.has("b1")).toBe(false);
  });
});

describe("todayHighlight", () => {
  const origin = "2026-11-01";
  const end = "2026-12-31";
  it("outlines the whole column in day and week zoom", () => {
    expect(todayHighlight("2026-11-08", origin, end, "day")).toEqual({ kind: "box", x: 7 * 36, width: 36 });
    expect(todayHighlight("2026-11-08", origin, end, "week")).toEqual({ kind: "box", x: 7 * 16, width: 16 });
  });
  it("draws a centered 2px line in month zoom", () => {
    expect(todayHighlight("2026-11-08", origin, end, "month")).toEqual({ kind: "line", x: 7 * 4 + 1, width: 2 });
  });
  it("returns null outside the range", () => {
    expect(todayHighlight("2026-10-31", origin, end, "day")).toBeNull();
    expect(todayHighlight("2027-01-01", origin, end, "month")).toBeNull();
  });
});

describe("firstSundayX", () => {
  const px = PX_PER_DAY.week;

  it("is 0 when the origin is a Sunday", () => {
    expect(firstSundayX("2026-11-08", px)).toBe(0);
  });

  it("counts days until the next Sunday", () => {
    expect(firstSundayX("2026-11-04", px)).toBe(4 * px); // Wednesday
    expect(firstSundayX("2026-11-07", px)).toBe(px); // Saturday
    expect(firstSundayX("2026-11-09", px)).toBe(6 * px); // Monday
  });
});
