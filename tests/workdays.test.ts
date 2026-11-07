import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, diffDays, todayInBangkok } from "@/lib/dates";
import {
  addWorkdays,
  countWorkdays,
  isWorkday,
  snapToWorkday,
} from "@/lib/workdays";

const TH = new Set(["2026-04-13", "2026-04-14", "2026-04-15"]);

describe("dates", () => {
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-04-30", 1)).toBe("2026-05-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("diffDays is b - a", () => {
    expect(diffDays("2026-04-10", "2026-04-17")).toBe(7);
    expect(diffDays("2026-04-17", "2026-04-10")).toBe(-7);
  });

  it("dayOfWeek returns 0 for Sunday", () => {
    expect(dayOfWeek("2026-04-12")).toBe(0);
    expect(dayOfWeek("2026-04-11")).toBe(6);
  });

  it("todayInBangkok uses the Bangkok date near midnight UTC", () => {
    expect(todayInBangkok(new Date("2026-04-12T18:30:00Z"))).toBe("2026-04-13");
    expect(todayInBangkok(new Date("2026-04-12T16:59:59Z"))).toBe("2026-04-12");
  });
});

describe("workdays", () => {
  it("isWorkday rejects weekends and holidays", () => {
    expect(isWorkday("2026-04-10", TH)).toBe(true);
    expect(isWorkday("2026-04-11", TH)).toBe(false);
    expect(isWorkday("2026-04-12", TH)).toBe(false);
    expect(isWorkday("2026-04-14", TH)).toBe(false);
  });

  it("snapToWorkday returns the date itself when it is a workday", () => {
    expect(snapToWorkday("2026-04-10", TH)).toBe("2026-04-10");
  });

  it("snapToWorkday skips weekend and holidays", () => {
    expect(snapToWorkday("2026-04-11", TH)).toBe("2026-04-16");
  });

  it("addWorkdays skips weekends and holidays", () => {
    expect(addWorkdays("2026-04-10", 1, TH)).toBe("2026-04-16");
    expect(addWorkdays("2026-04-10", 2, TH)).toBe("2026-04-17");
  });

  it("addWorkdays with 0 snaps the start", () => {
    expect(addWorkdays("2026-04-11", 0, TH)).toBe("2026-04-16");
    expect(addWorkdays("2026-04-10", 0, TH)).toBe("2026-04-10");
  });

  it("countWorkdays is inclusive", () => {
    expect(countWorkdays("2026-04-10", "2026-04-17", TH)).toBe(3);
    expect(countWorkdays("2026-04-10", "2026-04-10", TH)).toBe(1);
    expect(countWorkdays("2026-04-11", "2026-04-12", TH)).toBe(0);
  });
});
