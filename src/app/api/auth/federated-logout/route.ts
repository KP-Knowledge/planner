import { getToken } from "next-auth/jwt";

function appUrl(req: Request): string {
  return (process.env.AUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const base = appUrl(req);
  const secure = base.startsWith("https://");
  const cookieName = `${secure ? "__Secure-" : ""}authjs.session-token`;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: secure,
    cookieName,
    salt: cookieName,
  });

  const issuer = process.env.KEYCLOAK_ISSUER;
  const signin = `${base}/signin`;
  let target = signin;
  if (issuer) {
    const url = new URL(`${issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
    if (token?.idToken) url.searchParams.set("id_token_hint", token.idToken);
    url.searchParams.set("post_logout_redirect_uri", signin);
    target = url.toString();
  }

  const res = Response.redirect(target, 302);
  const headers = new Headers(res.headers);
  // Session token may be chunked (.0, .1, ...) when large; expire the base name and common chunks.
  const names = [cookieName, ...Array.from({ length: 4 }, (_, i) => `${cookieName}.${i}`)];
  for (const name of names) {
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
    );
  }
  return new Response(null, { status: 302, headers });
}
