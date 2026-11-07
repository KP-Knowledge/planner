import { getToken } from "next-auth/jwt";
import {
  buildLogoutUrl,
  expiredSessionCookies,
  pickSessionCookieName,
  resolveBaseUrl,
} from "@/server/logout";

export async function GET(req: Request) {
  const base = resolveBaseUrl(req, process.env.AUTH_URL);
  const cookieName = pickSessionCookieName(req.headers.get("cookie"));

  const token = cookieName
    ? await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        cookieName,
        salt: cookieName,
        secureCookie: cookieName.startsWith("__Secure-"),
      })
    : null;

  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const target =
    issuer && clientId
      ? buildLogoutUrl({ issuer, clientId, idToken: token?.idToken, base })
      : `${base}/signin`;

  const headers = new Headers({ Location: target });
  for (const c of expiredSessionCookies(base.startsWith("https://"))) {
    headers.append("Set-Cookie", c);
  }
  return new Response(null, { status: 302, headers });
}
