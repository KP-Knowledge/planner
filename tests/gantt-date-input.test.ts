import { describe, expect, it } from "vitest";
import { DATE_MAX, DATE_MIN, resolveDraft, yearInRange } from "@/features/gantt/dateInput";

describe("yearInRange", () => {
  it("accepts 2000..2100 and empty input", () => {
    expect(yearInRange("")).toBe(true);
    expect(yearInRange("2000-01-01")).toBe(true);
    expect(yearInRange("2100-12-31")).toBe(true);
  });

  it("rejects partially typed years", () => {
    expect(yearInRange("0202-03-04")).toBe(false);
    expect(yearInRange("0002-03-04")).toBe(false);
    expect(yearInRange("1999-12-31")).toBe(false);
    expect(yearInRange("2101-01-01")).toBe(false);
    expect(yearInRange("20222-01-01")).toBe(false);
  });

  it("exposes matching min/max attributes", () => {
    expect(DATE_MIN).toBe("2000-01-01");
    expect(DATE_MAX).toBe("2100-12-31");
  });
});

describe("resolveDraft", () => {
  it("commits a valid range", () => {
    expect(resolveDraft({ start: "2026-04-01", end: "2026-04-03" }, false)).toEqual({
      ok: true,
      start: "2026-04-01",
      end: "2026-04-03",
    });
  });

  it("does not save a keystroke-year like 0202", () => {
    expect(resolveDraft({ start: "0202-04-01", end: "2026-04-03" }, false)).toEqual({
      ok: false,
      reason: "year",
    });
    expect(resolveDraft({ start: "2026-04-01", end: "0202-04-03" }, false)).toEqual({
      ok: false,
      reason: "year",
    });
  });

  it("flags end before start and incomplete input", () => {
    expect(resolveDraft({ start: "2026-04-05", end: "2026-04-03" }, false)).toEqual({
      ok: false,
      reason: "range",
    });
    expect(resolveDraft({ start: "", end: "2026-04-03" }, false)).toEqual({
      ok: false,
      reason: "incomplete",
    });
  });

  it("milestones use the start date for both ends", () => {
    expect(resolveDraft({ start: "2026-04-05", end: "2026-04-01" }, true)).toEqual({
      ok: true,
      start: "2026-04-05",
      end: "2026-04-05",
    });
  });
});
