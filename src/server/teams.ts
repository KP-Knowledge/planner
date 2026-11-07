import { asc, eq } from "drizzle-orm";
import { teams } from "@/db/schema";
import type { Db } from "@/db/types";
import { ApiError } from "./errors";
import type { TeamCreate, TeamPatch } from "./schemas";

export type Team = typeof teams.$inferSelect;

export async function listTeams(db: Db): Promise<Team[]> {
  return db.select().from(teams).orderBy(asc(teams.name), asc(teams.id));
}

export async function createTeam(db: Db, input: TeamCreate): Promise<Team> {
  const [row] = await db.insert(teams).values(input).returning();
  return row;
}

export async function updateTeam(db: Db, id: string, patch: TeamPatch): Promise<Team> {
  const set: Partial<typeof teams.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.color !== undefined) set.color = patch.color;
  if (Object.keys(set).length === 0) {
    const [row] = await db.select().from(teams).where(eq(teams.id, id));
    if (!row) throw new ApiError(404, "not_found");
    return row;
  }
  const [row] = await db.update(teams).set(set).where(eq(teams.id, id)).returning();
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

// tasks.team_id is ON DELETE SET NULL, so tasks fall back to the default color.
export async function deleteTeam(db: Db, id: string): Promise<void> {
  const rows = await db.delete(teams).where(eq(teams.id, id)).returning({ id: teams.id });
  if (rows.length === 0) throw new ApiError(404, "not_found");
}
