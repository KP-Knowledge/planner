import { getDb } from "@/db/client";
import { deleteDependency } from "@/server/dependencies";
import { routeId, withAuth } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteDependency(getDb(), id);
  return new Response(null, { status: 204 });
});
