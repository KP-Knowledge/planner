import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { reorder } from "@/server/projects";
import { orderBody } from "@/server/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = orderBody.parse(await req.json());
  await reorder(getDb(), id, body);
  return new Response(null, { status: 204 });
});
