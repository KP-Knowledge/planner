import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { getGantt } from "@/server/projects";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_req, ctx) => {
  return Response.json(await getGantt(getDb(), await routeId(ctx)));
});
