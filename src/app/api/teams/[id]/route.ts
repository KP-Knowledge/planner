import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { teamPatch } from "@/server/schemas";
import { deleteTeam, updateTeam } from "@/server/teams";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = teamPatch.parse(await req.json());
  return Response.json(await updateTeam(getDb(), id, body));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteTeam(getDb(), id);
  return new Response(null, { status: 204 });
});
