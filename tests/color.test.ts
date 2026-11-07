import { describe, expect, it } from "vitest";
import { resolveTaskColor } from "@/lib/color";

describe("resolveTaskColor", () => {
  it("falls back to the default", () => {
    expect(resolveTaskColor({ color: null }, null)).toBe("#4F46E5");
  });

  it("uses the team color when the task has none", () => {
    expect(resolveTaskColor({ color: null }, { color: "#10B981" })).toBe("#10B981");
  });

  it("prefers the task override", () => {
    expect(resolveTaskColor({ color: "#EF4444" }, { color: "#10B981" })).toBe("#EF4444");
  });
});
