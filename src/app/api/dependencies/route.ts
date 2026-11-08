import { getDb } from "@/db/client";
import { createDependency } from "@/server/dependencies";
import { withAuth } from "@/server/http";
import { dependencyCreate } from "@/server/schemas";

export const POST = withAuth(async (req) => {
  const body = dependencyCreate.parse(await req.json());
  return Response.json(await createDependency(getDb(), body), { status: 201 });
});
