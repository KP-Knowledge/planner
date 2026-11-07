import type { ISODate } from "@/lib/dates";

/** UTC midnight for an ISODate. Format with `timeZone: "UTC"` so the day never shifts. */
export function utcDate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
