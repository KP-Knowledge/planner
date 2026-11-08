import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("health check failed", err);
    return Response.json({ ok: false }, { status: 503 });
  }
}
