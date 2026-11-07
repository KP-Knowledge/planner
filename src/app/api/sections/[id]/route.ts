import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { sectionPatch } from "@/server/schemas";
import { deleteSection, updateSection } from "@/server/sections";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = sectionPatch.parse(await req.json());
  return Response.json(await updateSection(getDb(), id, body));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteSection(getDb(), id);
  return new Response(null, { status: 204 });
});
