import { addDays, dayOfWeek, type ISODate } from "./dates";

export type HolidaySet = ReadonlySet<ISODate>;

export function isWorkday(d: ISODate, h: HolidaySet): boolean {
  const dow = dayOfWeek(d);
  return dow !== 0 && dow !== 6 && !h.has(d);
}

export function snapToWorkday(d: ISODate, h: HolidaySet): ISODate {
  let cur = d;
  while (!isWorkday(cur, h)) cur = addDays(cur, 1);
  return cur;
}

export function addWorkdays(d: ISODate, n: number, h: HolidaySet): ISODate {
  let cur = snapToWorkday(d, h);
  for (let i = 0; i < n; i++) cur = snapToWorkday(addDays(cur, 1), h);
  return cur;
}

export function countWorkdays(start: ISODate, end: ISODate, h: HolidaySet): number {
  let count = 0;
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
    if (isWorkday(cur, h)) count++;
  }
  return count;
}
