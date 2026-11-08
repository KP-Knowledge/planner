import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v !== null && typeof v === "object") {
      Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
    } else {
      acc[`${prefix}${k}`] = String(v);
    }
    return acc;
  }, {});
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

const flatEn = flatten(en);
const flatTh = flatten(th);

describe("messages", () => {
  it("en and th have identical key sets", () => {
    expect(Object.keys(flatTh).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("has no empty strings", () => {
    for (const flat of [flatEn, flatTh]) {
      expect(Object.entries(flat).filter(([, v]) => v === "")).toEqual([]);
    }
  });

  it("uses the same {placeholders} in en and th for every key", () => {
    for (const key of Object.keys(flatEn)) {
      expect({ key, p: placeholders(flatTh[key] ?? "") }).toEqual({
        key,
        p: placeholders(flatEn[key]),
      });
    }
  });
});
