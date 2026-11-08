const BASE_NAME = "authjs.session-token";
const SECURE_NAME = `__Secure-${BASE_NAME}`;
const CHUNKS = 4;

export function resolveBaseUrl(req: Request, authUrl: string | undefined): string {
  if (authUrl) return authUrl.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  if (proto && host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

function cookieNames(header: string | null | undefined): Set<string> {
  const names = new Set<string>();
  for (const part of (header ?? "").split(";")) {
    const name = part.split("=")[0].trim();
    if (name) names.add(name);
  }
  return names;
}

export function pickSessionCookieName(header: string | null | undefined): string | undefined {
  const names = cookieNames(header);
  for (const base of [SECURE_NAME, BASE_NAME]) {
    if (names.has(base) || names.has(`${base}.0`)) return base;
  }
  return undefined;
}

export function expiredSessionCookies(secure: boolean): string[] {
  const out: string[] = [];
  for (const base of [BASE_NAME, SECURE_NAME]) {
    const names = [base, ...Array.from({ length: CHUNKS }, (_, i) => `${base}.${i}`)];
    for (const name of names) {
      // Browsers only accept __Secure- cookies with the Secure attribute.
      const flag = secure || base === SECURE_NAME ? "; Secure" : "";
      out.push(`${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${flag}`);
    }
  }
  return out;
}

export function buildLogoutUrl(p: {
  issuer: string;
  clientId: string;
  idToken?: string;
  base: string;
}): string {
  const url = new URL(`${p.issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
  if (p.idToken) url.searchParams.set("id_token_hint", p.idToken);
  url.searchParams.set("client_id", p.clientId);
  url.searchParams.set("post_logout_redirect_uri", `${p.base}/signin`);
  return url.toString();
}
