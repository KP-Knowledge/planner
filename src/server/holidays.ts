import { and, asc, eq, gte, isNull, lt, or } from "drizzle-orm";
import Holidays from "date-holidays";
import { holidays, projects } from "@/db/schema";
import type { Db } from "@/db/types";
import { ApiError, isUniqueViolation } from "./errors";
import type { HolidayCreate, HolidayPatch } from "./schemas";
import type { Holiday } from "./projects";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new ApiError(400, "invalid_year");
  }
}

export async function importThaiHolidays(db: Db, year: number): Promise<{ inserted: number }> {
  assertYear(year);
  const rows = new Holidays("TH")
    .getHolidays(year, "th")
    .filter((h) => h.type === "public")
    .map((h) => ({
      date: h.date.slice(0, 10),
      name: h.name,
      projectId: null,
      source: "seed" as const,
    }));
  if (rows.length === 0) return { inserted: 0 };
  const inserted = await db
    .insert(holidays)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: holidays.id });
  return { inserted: inserted.length };
}

// A year is imported only when it has no seed rows, so deleted seed rows stay deleted.
export async function ensureSeeded(db: Db, years: number[]): Promise<Record<number, number>> {
  const result: Record<number, number> = {};
  for (const year of years) {
    assertYear(year);
    const existing = await db
      .select({ id: holidays.id })
      .from(holidays)
      .where(
        and(
          eq(holidays.source, "seed"),
          gte(holidays.date, `${year}-01-01`),
          lt(holidays.date, `${year + 1}-01-01`),
        ),
      )
      .limit(1);
    result[year] = existing.length > 0 ? 0 : (await importThaiHolidays(db, year)).inserted;
  }
  return result;
}

export async function listHolidays(
  db: Db,
  { year, projectId }: { year: number; projectId?: string },
): Promise<Holiday[]> {
  const scope = projectId
    ? or(isNull(holidays.projectId), eq(holidays.projectId, projectId))
    : isNull(holidays.projectId);
  return db
    .select()
    .from(holidays)
    .where(
      and(scope, gte(holidays.date, `${year}-01-01`), lt(holidays.date, `${year + 1}-01-01`)),
    )
    .orderBy(asc(holidays.date), asc(holidays.projectId), asc(holidays.id));
}

export async function createHoliday(db: Db, input: HolidayCreate): Promise<Holiday> {
  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, input.projectId));
    if (!project) throw new ApiError(404, "not_found");
  }
  try {
    const [row] = await db
      .insert(holidays)
      .values({
        date: input.date,
        name: input.name,
        projectId: input.projectId ?? null,
        source: "custom",
      })
      .returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "duplicate");
    throw err;
  }
}

export async function updateHoliday(db: Db, id: string, patch: HolidayPatch): Promise<Holiday> {
  const set: Partial<typeof holidays.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.date !== undefined) set.date = patch.date;
  if (Object.keys(set).length === 0) {
    const [row] = await db.select().from(holidays).where(eq(holidays.id, id));
    if (!row) throw new ApiError(404, "not_found");
    return row;
  }
  try {
    const [row] = await db
      .update(holidays)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(holidays.id, id))
      .returning();
    if (!row) throw new ApiError(404, "not_found");
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "duplicate");
    throw err;
  }
}

export async function deleteHoliday(db: Db, id: string): Promise<void> {
  const rows = await db.delete(holidays).where(eq(holidays.id, id)).returning({ id: holidays.id });
  if (rows.length === 0) throw new ApiError(404, "not_found");
}
