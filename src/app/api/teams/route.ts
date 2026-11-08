import { getDb } from "@/db/client";
import { withAuth } from "@/server/http";
import { teamCreate } from "@/server/schemas";
import { createTeam, listTeams } from "@/server/teams";

export const GET = withAuth(async () => {
  return Response.json(await listTeams(getDb()));
});

export const POST = withAuth(async (req) => {
  const body = teamCreate.parse(await req.json());
  return Response.json(await createTeam(getDb(), body), { status: 201 });
});
