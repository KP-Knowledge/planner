import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { todayInBangkok } from "@/lib/dates";
import { ensureSeeded } from "@/server/holidays";
import * as schema from "./schema";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle";

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    console.log(`migrations applied from ${migrationsFolder}`);

    const year = Number(todayInBangkok().slice(0, 4));
    const counts = await ensureSeeded(db, [year, year + 1]);
    for (const [y, n] of Object.entries(counts)) {
      console.log(`holidays ${y}: ${n} seeded`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
