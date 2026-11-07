import { getDb } from "@/db/client";
import { withAuth } from "@/server/http";
import { sectionCreate } from "@/server/schemas";
import { createSection } from "@/server/sections";

export const POST = withAuth(async (req) => {
  const body = sectionCreate.parse(await req.json());
  return Response.json(await createSection(getDb(), body), { status: 201 });
});
