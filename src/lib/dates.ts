export type ISODate = string;

const DAY_MS = 86_400_000;
const BANGKOK_OFFSET_MS = 7 * 3_600_000;

function toUtcMs(d: ISODate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function dayOfWeek(d: ISODate): number {
  return new Date(toUtcMs(d)).getUTCDay();
}

export function todayInBangkok(now: Date = new Date()): ISODate {
  return fromUtcMs(now.getTime() + BANGKOK_OFFSET_MS);
}
