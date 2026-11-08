import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./helpers/db";
import type { Db } from "@/db/types";
import { listUsers, upsertUserFromProfile } from "@/server/users";

describe("users", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("upsert keeps id and updates name for the same sub", async () => {
    const a = await upsertUserFromProfile(db, { sub: "kc-1", name: "Old", email: "a@x.io" });
    const b = await upsertUserFromProfile(db, { sub: "kc-1", name: "New", email: "a@x.io" });
    expect(b.id).toBe(a.id);
    const all = await listUsers(db);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("New");
  });

  it("upsert does not blank fields missing from the profile", async () => {
    await upsertUserFromProfile(db, { sub: "kc-2", name: "N", email: "n@x.io", picture: "http://p" });
    await upsertUserFromProfile(db, { sub: "kc-2" });
    const [u] = await listUsers(db);
    expect(u).toMatchObject({ name: "N", email: "n@x.io", image: "http://p" });
  });

  it("listUsers is ordered by name", async () => {
    await upsertUserFromProfile(db, { sub: "1", name: "Zed" });
    await upsertUserFromProfile(db, { sub: "2", name: "Amy" });
    expect((await listUsers(db)).map((u) => u.name)).toEqual(["Amy", "Zed"]);
  });
});
