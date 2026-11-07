import { asc, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Db } from "@/db/types";

export type User = typeof users.$inferSelect;

export type KeycloakProfile = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

export async function upsertUserFromProfile(
  db: Db,
  p: KeycloakProfile,
): Promise<{ id: string }> {
  const set: Partial<typeof users.$inferInsert> = {};
  if (p.name) set.name = p.name;
  if (p.email) set.email = p.email;
  if (p.picture) set.image = p.picture;

  const [row] = await db
    .insert(users)
    .values({
      keycloakSub: p.sub,
      name: p.name ?? null,
      email: p.email ?? null,
      image: p.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.keycloakSub,
      set: { ...set, updatedAt: new Date() },
    })
    .returning({ id: users.id });
  return row;
}

export async function listUsers(db: Db): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name), asc(users.id));
}

export async function getUserById(db: Db, id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}
