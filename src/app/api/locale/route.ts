import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale = body?.locale;
  if (!isLocale(locale)) {
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
