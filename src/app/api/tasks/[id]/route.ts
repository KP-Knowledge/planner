import { getDb } from "@/db/client";
import { routeId, withAuth } from "@/server/http";
import { taskPatch } from "@/server/schemas";
import { deleteTask, updateTask } from "@/server/tasks";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, ctx) => {
  const id = await routeId(ctx);
  const body = taskPatch.parse(await req.json());
  return Response.json(await updateTask(getDb(), id, body));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const id = await routeId(ctx);
  await deleteTask(getDb(), id);
  return new Response(null, { status: 204 });
});
