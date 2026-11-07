import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object"
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("en and th have identical key sets", () => {
    expect(keys(th).sort()).toEqual(keys(en).sort());
  });

  it("has no empty strings", () => {
    for (const msgs of [en, th]) {
      const flat = JSON.stringify(msgs);
      expect(flat).not.toContain('""');
    }
  });
});
