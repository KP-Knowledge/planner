import { describe, expect, it } from "vitest";
import { monthGrid } from "@/features/holidays/monthLayout";

describe("monthGrid", () => {
  it("pads a month that starts on Sunday with six leading nulls (Monday first)", () => {
    const weeks = monthGrid(2026, 11);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[5]).toEqual(["2026-11-30", null, null, null, null, null, null]);
  });

  it("has no padding when a 28-day month starts on Monday", () => {
    const weeks = monthGrid(2027, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2027-02-01");
    expect(weeks[3][6]).toBe("2027-02-28");
    expect(weeks.flat().every((d) => d !== null)).toBe(true);
  });

  it("handles leap-year February", () => {
    const weeks = monthGrid(2028, 2);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, "2028-02-01", "2028-02-02", "2028-02-03", "2028-02-04", "2028-02-05", "2028-02-06"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(29);
  });

  it("always returns full 7-day weeks covering every day once, in order", () => {
    for (let month = 1; month <= 12; month++) {
      const weeks = monthGrid(2026, month);
      expect(weeks.every((w) => w.length === 7)).toBe(true);
      const days = weeks.flat().filter((d): d is string => d !== null);
      expect(days).toEqual([...days].sort());
      expect(new Set(days).size).toBe(days.length);
      expect(days[0]).toBe(`2026-${String(month).padStart(2, "0")}-01`);
    }
  });

  it("rejects a month outside 1-12", () => {
    expect(() => monthGrid(2026, 0)).toThrow(RangeError);
    expect(() => monthGrid(2026, 13)).toThrow(RangeError);
  });
});
