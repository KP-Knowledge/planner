import { describe, expect, it } from "vitest";
import type { BarPosition } from "@/features/gantt/DependencyLayer";
import { ROW_HEIGHT } from "@/features/gantt/layout";
import { DROP_SLOP, taskAtPoint } from "@/features/gantt/useDependencyDrag";

const positions = new Map<string, BarPosition>([
  ["a", { x: 100, width: 72, row: 0 }],
  ["b", { x: 200, width: 36, row: 1 }],
  ["c", { x: 50, width: 36, row: 3 }],
]);
const mid = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2;

describe("taskAtPoint", () => {
  it("finds the task whose row and x range contain the point", () => {
    expect(taskAtPoint(positions, 120, mid(0))).toBe("a");
    expect(taskAtPoint(positions, 210, mid(1))).toBe("b");
    expect(taskAtPoint(positions, 60, mid(3))).toBe("c");
  });

  it("returns null on empty space and rows without a bar", () => {
    expect(taskAtPoint(positions, 400, mid(0))).toBeNull();
    expect(taskAtPoint(positions, 120, mid(2))).toBeNull();
    expect(taskAtPoint(positions, 120, mid(9))).toBeNull();
  });

  it("treats row boundaries as belonging to the lower row", () => {
    expect(taskAtPoint(positions, 210, ROW_HEIGHT)).toBe("b");
    expect(taskAtPoint(positions, 120, ROW_HEIGHT - 0.01)).toBe("a");
  });

  it("allows a small slop outside the bar edges", () => {
    expect(taskAtPoint(positions, 100 - DROP_SLOP, mid(0))).toBe("a");
    expect(taskAtPoint(positions, 172 + DROP_SLOP, mid(0))).toBe("a");
    expect(taskAtPoint(positions, 100 - DROP_SLOP - 1, mid(0))).toBeNull();
    expect(taskAtPoint(positions, 172 + DROP_SLOP + 1, mid(0))).toBeNull();
  });

  it("returns null above the timeline", () => {
    expect(taskAtPoint(positions, 120, -5)).toBeNull();
  });
});
