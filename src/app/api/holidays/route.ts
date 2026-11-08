import { getDb } from "@/db/client";
import { createHoliday, listHolidays } from "@/server/holidays";
import { withAuth } from "@/server/http";
import { holidayCreate, holidayListQuery } from "@/server/schemas";

export const GET = withAuth(async (req) => {
  const params = new URL(req.url).searchParams;
  const query = holidayListQuery.parse({
    year: params.get("year") ?? undefined,
    projectId: params.get("projectId") ?? undefined,
  });
  return Response.json(await listHolidays(getDb(), query));
});

export const POST = withAuth(async (req) => {
  const body = holidayCreate.parse(await req.json());
  return Response.json(await createHoliday(getDb(), body), { status: 201 });
});
