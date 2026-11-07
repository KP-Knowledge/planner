import { NextResponse } from "next/server";
import { LOCALE_COOKIE, locales } from "@/i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale = locales.find((l) => l === body?.locale);
  if (!locale) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return response;
}
