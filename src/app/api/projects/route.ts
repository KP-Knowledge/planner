import { getDb } from "@/db/client";
import { withAuth } from "@/server/http";
import { createProject, listProjects } from "@/server/projects";
import { projectCreate, projectListQuery } from "@/server/schemas";

export const GET = withAuth(async (req) => {
  const query = projectListQuery.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return Response.json(await listProjects(getDb(), query.archived === "true"));
});

export const POST = withAuth(async (req) => {
  const body = projectCreate.parse(await req.json());
  return Response.json(await createProject(getDb(), body), { status: 201 });
});
