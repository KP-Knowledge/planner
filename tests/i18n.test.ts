import { describe, expect, it } from "vitest";
import { resolveLocale } from "@/i18n/request";

describe("resolveLocale", () => {
  it("defaults to en when the cookie is missing", () => {
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("accepts th", () => {
    expect(resolveLocale("th")).toBe("th");
  });

  it("falls back to en for unsupported values", () => {
    expect(resolveLocale("fr")).toBe("en");
  });
});
