import { describe, expect, it } from "vitest";
import { PX_PER_DAY } from "@/features/gantt/layout";
import { dragTargetDate, keyboardDrag } from "@/features/gantt/useBarDrag";

const none = new Set<string>();
const task = { startDate: "2026-04-08", endDate: "2026-04-10", isMilestone: false };
const px = PX_PER_DAY.day;

describe("dragTargetDate", () => {
  it("no movement keeps the edge date", () => {
    expect(dragTargetDate("move", task, 0, "2026-04-01", "day")).toBe("2026-04-08");
    expect(dragTargetDate("resize-end", task, 0, "2026-04-01", "day")).toBe("2026-04-10");
  });

  it("rounds to the nearest day", () => {
    expect(dragTargetDate("move", task, px * 2 + px * 0.4, "2026-04-01", "day")).toBe("2026-04-10");
    expect(dragTargetDate("move", task, px * 2 + px * 0.6, "2026-04-01", "day")).toBe("2026-04-11");
    expect(dragTargetDate("move", task, -px, "2026-04-01", "day")).toBe("2026-04-07");
  });

  it("resize-start tracks the start edge, resize-end the end edge", () => {
    expect(dragTargetDate("resize-start", task, px, "2026-04-01", "day")).toBe("2026-04-09");
    expect(dragTargetDate("resize-end", task, px, "2026-04-01", "day")).toBe("2026-04-11");
  });
});

describe("keyboardDrag", () => {
  it("arrows move one day, ignoring other keys", () => {
    expect(keyboardDrag(task, "ArrowRight", false, none)).toEqual({ kind: "move", target: "2026-04-09" });
    expect(keyboardDrag(task, "ArrowLeft", false, none)).toEqual({ kind: "move", target: "2026-04-07" });
    expect(keyboardDrag(task, "a", false, none)).toBeNull();
  });

  it("stepping back from a Monday lands on the previous Friday", () => {
    const mon = { ...task, startDate: "2026-04-06" };
    expect(keyboardDrag(mon, "ArrowLeft", false, none)?.target).toBe("2026-04-03");
  });

  it("stepping back over Songkran lands before the holidays", () => {
    const h = new Set(["2026-04-13", "2026-04-14", "2026-04-15"]);
    const t = { ...task, startDate: "2026-04-16" };
    expect(keyboardDrag(t, "ArrowLeft", false, h)?.target).toBe("2026-04-10");
  });

  it("Shift resizes the end, skipping weekends going forward", () => {
    const fri = { ...task, endDate: "2026-04-10" };
    expect(keyboardDrag(fri, "ArrowRight", true, none)).toEqual({ kind: "resize-end", target: "2026-04-13" });
    expect(keyboardDrag(fri, "ArrowLeft", true, none)).toEqual({ kind: "resize-end", target: "2026-04-09" });
  });

  it("milestones cannot resize", () => {
    expect(keyboardDrag({ ...task, isMilestone: true }, "ArrowRight", true, none)).toBeNull();
  });
});
