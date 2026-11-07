import { getDb } from "@/db/client";
import { importThaiHolidays } from "@/server/holidays";
import { withAuth } from "@/server/http";
import { holidayImport } from "@/server/schemas";

export const POST = withAuth(async (req) => {
  const { year } = holidayImport.parse(await req.json());
  return Response.json(await importThaiHolidays(getDb(), year));
});
