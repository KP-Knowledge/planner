import { getDb } from "@/db/client";
import { deleteHoliday, updateHoliday } from "@/server/holidays";
import { routeId, withAuth } from "@/server/http";
import { holidayPatch } from "@/server/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = holidayPatch.parse(await req.json());
  return Response.json(await updateHoliday(getDb(), id, body));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteHoliday(getDb(), id);
  return new Response(null, { status: 204 });
});
