import { eq, isNull, or } from "drizzle-orm";
import { holidays } from "@/db/schema";
import type { Db } from "@/db/types";
import type { HolidaySet } from "@/lib/workdays";

export async function getHolidaySet(db: Db, projectId: string): Promise<HolidaySet> {
  const rows = await db
    .select({ date: holidays.date })
    .from(holidays)
    .where(or(isNull(holidays.projectId), eq(holidays.projectId, projectId)));
  return new Set(rows.map((r) => r.date));
}
