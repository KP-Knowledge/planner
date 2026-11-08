import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let instance: NodePgDatabase<typeof schema> | undefined;

function create(): NodePgDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  pool.on("error", (err) => {
    console.error("postgres pool error", err);
  });
  return drizzle(pool, { schema });
}

export function getDb(): NodePgDatabase<typeof schema> {
  instance ??= create();
  return instance;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
