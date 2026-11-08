export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;
export const DATE_MIN = `${YEAR_MIN}-01-01`;
export const DATE_MAX = `${YEAR_MAX}-12-31`;

/** True when `value` is empty (incomplete input) or a date whose year is within the supported range. */
export function yearInRange(value: string): boolean {
  if (value === "") return true;
  const year = Number(value.split("-")[0]);
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX;
}

export type DateDraft = { start: string; end: string };

export type DateCommit =
  | { ok: true; start: string; end: string }
  | { ok: false; reason: "incomplete" | "year" | "range" };

/** Decide whether a draft can be saved. Milestones keep end equal to start. */
export function resolveDraft(draft: DateDraft, isMilestone: boolean): DateCommit {
  const start = draft.start;
  const end = isMilestone ? draft.start : draft.end;
  if (start === "" || end === "") return { ok: false, reason: "incomplete" };
  if (!yearInRange(start) || !yearInRange(end)) return { ok: false, reason: "year" };
  if (end < start) return { ok: false, reason: "range" };
  return { ok: true, start, end };
}
