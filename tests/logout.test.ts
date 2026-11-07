import { describe, expect, it } from "vitest";
import {
  buildLogoutUrl,
  expiredSessionCookies,
  pickSessionCookieName,
  resolveBaseUrl,
} from "@/server/logout";

describe("expiredSessionCookies", () => {
  it("expires both prefixed and unprefixed names and their chunks", () => {
    const all = expiredSessionCookies(true).join("\n");
    for (const name of [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.session-token.0",
      "__Secure-authjs.session-token.3",
    ]) {
      expect(all).toContain(`${name}=; Path=/; Max-Age=0`);
    }
  });

  it("only adds Secure when asked", () => {
    expect(expiredSessionCookies(false).join("\n")).not.toContain("Secure;");
    expect(expiredSessionCookies(true).every((c) => c.includes("; Secure"))).toBe(true);
  });
});

describe("pickSessionCookieName", () => {
  it("prefers the secure name when present", () => {
    expect(
      pickSessionCookieName("a=1; authjs.session-token=x; __Secure-authjs.session-token=y"),
    ).toBe("__Secure-authjs.session-token");
  });
  it("finds the unprefixed name", () => {
    expect(pickSessionCookieName("authjs.session-token=x")).toBe("authjs.session-token");
  });
  it("detects chunked cookies", () => {
    expect(pickSessionCookieName("__Secure-authjs.session-token.0=x; __Secure-authjs.session-token.1=y")).toBe(
      "__Secure-authjs.session-token",
    );
  });
  it("returns undefined without a session cookie", () => {
    expect(pickSessionCookieName("foo=bar")).toBeUndefined();
    expect(pickSessionCookieName(null)).toBeUndefined();
  });
});

describe("buildLogoutUrl", () => {
  const base = "https://planner.example.com";
  const issuer = "https://kc.example.com/realms/r/";

  it("includes id_token_hint, client_id and post_logout_redirect_uri", () => {
    const url = new URL(buildLogoutUrl({ issuer, clientId: "planner", idToken: "a.b+c/d=", base }));
    expect(url.origin + url.pathname).toBe("https://kc.example.com/realms/r/protocol/openid-connect/logout");
    expect(url.searchParams.get("id_token_hint")).toBe("a.b+c/d=");
    expect(url.searchParams.get("client_id")).toBe("planner");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe(`${base}/signin`);
  });

  it("omits id_token_hint when absent but keeps client_id", () => {
    const url = new URL(buildLogoutUrl({ issuer, clientId: "planner", base }));
    expect(url.searchParams.has("id_token_hint")).toBe(false);
    expect(url.searchParams.get("client_id")).toBe("planner");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe(`${base}/signin`);
  });
});

describe("resolveBaseUrl", () => {
  it("prefers AUTH_URL and trims trailing slash", () => {
    expect(resolveBaseUrl(new Request("http://internal:3000/x"), "https://p.example.com/")).toBe(
      "https://p.example.com",
    );
  });
  it("uses forwarded headers behind a proxy", () => {
    const req = new Request("http://internal:3000/x", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "p.example.com" },
    });
    expect(resolveBaseUrl(req, undefined)).toBe("https://p.example.com");
  });
  it("falls back to the request origin", () => {
    expect(resolveBaseUrl(new Request("http://localhost:3000/x"), undefined)).toBe("http://localhost:3000");
  });
});
