import { getDb } from "@/db/client";
import { withAuth } from "@/server/http";
import { taskCreate } from "@/server/schemas";
import { createTask } from "@/server/tasks";

export const POST = withAuth(async (req) => {
  const body = taskCreate.parse(await req.json());
  return Response.json(await createTask(getDb(), body), { status: 201 });
});
