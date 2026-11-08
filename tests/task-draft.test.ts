import { describe, expect, it } from "vitest";
import { draftToPatch, initialDraft, isDirty, validateDraft } from "@/features/gantt/taskDraft";
import type { Task } from "@/server/tasks";

const task = {
  id: "t1",
  name: "Build",
  description: null,
  startDate: "2026-11-02",
  endDate: "2026-11-06",
  progress: 40,
  isMilestone: false,
  teamId: null,
  color: null,
  assigneeIds: ["u1", "u2"],
} as unknown as Task;

describe("initialDraft", () => {
  it("copies editable fields, mapping nulls to form values", () => {
    expect(initialDraft(task)).toEqual({
      name: "Build",
      description: "",
      startDate: "2026-11-02",
      endDate: "2026-11-06",
      progress: 40,
      isMilestone: false,
      teamId: "",
      color: null,
      assigneeIds: ["u1", "u2"],
    });
  });
});

describe("draftToPatch / isDirty", () => {
  it("is empty and clean for an untouched draft", () => {
    const d = initialDraft(task);
    expect(draftToPatch(task, d)).toEqual({});
    expect(isDirty(task, d)).toBe(false);
  });

  it("includes only changed fields", () => {
    const d = { ...initialDraft(task), name: "Ship", progress: 80 };
    expect(draftToPatch(task, d)).toEqual({ name: "Ship", progress: 80 });
    expect(isDirty(task, d)).toBe(true);
  });

  it("trims the name and ignores whitespace-only changes", () => {
    expect(draftToPatch(task, { ...initialDraft(task), name: "  Build  " })).toEqual({});
    expect(draftToPatch(task, { ...initialDraft(task), name: " Ship " })).toEqual({ name: "Ship" });
  });

  it("maps a blank description to null and compares against the stored value", () => {
    expect(draftToPatch(task, { ...initialDraft(task), description: "   " })).toEqual({});
    expect(draftToPatch(task, { ...initialDraft(task), description: "Notes" })).toEqual({ description: "Notes" });
    const withDesc = { ...task, description: "Notes" } as Task;
    expect(draftToPatch(withDesc, { ...initialDraft(withDesc), description: "" })).toEqual({ description: null });
  });

  it("maps no team to null", () => {
    expect(draftToPatch(task, { ...initialDraft(task), teamId: "tm" })).toEqual({ teamId: "tm" });
    const withTeam = { ...task, teamId: "tm" } as Task;
    expect(draftToPatch(withTeam, { ...initialDraft(withTeam), teamId: "" })).toEqual({ teamId: null });
  });

  it("handles color set and cleared", () => {
    expect(draftToPatch(task, { ...initialDraft(task), color: "#ff0000" })).toEqual({ color: "#ff0000" });
    const colored = { ...task, color: "#ff0000" } as Task;
    expect(draftToPatch(colored, { ...initialDraft(colored), color: null })).toEqual({ color: null });
  });

  it("compares assignees as sets", () => {
    expect(draftToPatch(task, { ...initialDraft(task), assigneeIds: ["u2", "u1"] })).toEqual({});
    expect(draftToPatch(task, { ...initialDraft(task), assigneeIds: ["u1"] })).toEqual({ assigneeIds: ["u1"] });
  });

  it("sends changed dates", () => {
    const d = { ...initialDraft(task), startDate: "2026-11-03", endDate: "2026-11-09" };
    expect(draftToPatch(task, d)).toEqual({ startDate: "2026-11-03", endDate: "2026-11-09" });
  });

  it("forces end = start for a milestone draft", () => {
    const d = { ...initialDraft(task), isMilestone: true, startDate: "2026-11-03", endDate: "2026-11-09" };
    expect(draftToPatch(task, d)).toEqual({ isMilestone: true, startDate: "2026-11-03", endDate: "2026-11-03" });
  });
});

describe("validateDraft", () => {
  it("accepts an unchanged draft", () => {
    expect(validateDraft(initialDraft(task))).toEqual({ ok: true });
  });

  it("rejects an empty or blank name", () => {
    expect(validateDraft({ ...initialDraft(task), name: "  " })).toEqual({ ok: false, name: "empty", dates: null });
  });

  it("rejects end before start", () => {
    const d = { ...initialDraft(task), endDate: "2026-11-01" };
    expect(validateDraft(d)).toEqual({ ok: false, name: null, dates: "range" });
  });

  it("ignores end for milestones", () => {
    const d = { ...initialDraft(task), isMilestone: true, endDate: "2026-11-01" };
    expect(validateDraft(d)).toEqual({ ok: true });
  });

  it("rejects years outside 2000..2100", () => {
    expect(validateDraft({ ...initialDraft(task), startDate: "1999-12-31" })).toMatchObject({ dates: "year" });
    expect(validateDraft({ ...initialDraft(task), endDate: "2101-01-01" })).toMatchObject({ dates: "year" });
    expect(validateDraft({ ...initialDraft(task), startDate: "0202-01-01" })).toMatchObject({ dates: "year" });
  });

  it("rejects a cleared date", () => {
    expect(validateDraft({ ...initialDraft(task), startDate: "" })).toMatchObject({ ok: false, dates: "incomplete" });
  });

  it("reports name and dates problems together", () => {
    const d = { ...initialDraft(task), name: "", endDate: "2026-01-01" };
    expect(validateDraft(d)).toEqual({ ok: false, name: "empty", dates: "range" });
  });
});
