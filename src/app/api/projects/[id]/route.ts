import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { deleteProject, updateProject } from "@/server/projects";
import { projectPatch } from "@/server/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = projectPatch.parse(await req.json());
  return Response.json(await updateProject(getDb(), id, body));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteProject(getDb(), id);
  return new Response(null, { status: 204 });
});
