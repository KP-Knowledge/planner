import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/db";
import { rejection, seedProject, seedTask } from "./helpers";
import type { Db } from "@/db/types";
import { tasks } from "@/db/schema";
import { createTeam, deleteTeam, listTeams, updateTeam } from "@/server/teams";
import { updateTask } from "@/server/tasks";

describe("teams", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("create, list, update", async () => {
    const t = await createTeam(db, { name: "Dev", color: "#4F46E5" });
    expect(await listTeams(db)).toHaveLength(1);
    const u = await updateTeam(db, t.id, { name: "Eng", color: "#EC4899" });
    expect(u).toMatchObject({ name: "Eng", color: "#EC4899" });
    expect((await rejection(updateTeam(db, "00000000-0000-4000-8000-000000000000", { name: "x" }))).status).toBe(404);
  });

  it("team delete nulls task teamId", async () => {
    const { section } = await seedProject(db);
    const team = await createTeam(db, { name: "Dev", color: "#4F46E5" });
    const a = await seedTask(db, section.id, "A", "2026-11-09", "2026-11-09");
    await updateTask(db, a.id, { teamId: team.id });
    await deleteTeam(db, team.id);
    const [row] = await db.select().from(tasks);
    expect(row.teamId).toBeNull();
    expect(await listTeams(db)).toHaveLength(0);
    expect((await rejection(deleteTeam(db, team.id))).status).toBe(404);
  });
});
