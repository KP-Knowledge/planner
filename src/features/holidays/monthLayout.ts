import { dayOfWeek, type ISODate } from "@/lib/dates";

const pad = (n: number) => String(n).padStart(2, "0");

/** Weeks of one month, Monday first. Days outside the month are `null`. `month` is 1-12. */
export function monthGrid(year: number, month: number): (ISODate | null)[][] {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`invalid month ${month}`);
  const prefix = `${year}-${pad(month)}`;
  const lead = (dayOfWeek(`${prefix}-01`) + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (ISODate | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${prefix}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
