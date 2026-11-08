import { getDb } from "@/db/client";
import { withAuth } from "@/server/http";
import { listUsers } from "@/server/users";

export const GET = withAuth(async () => {
  return Response.json(await listUsers(getDb()));
});
