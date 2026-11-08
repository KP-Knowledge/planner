import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ NextResponse: { redirect: vi.fn() } }));

import { config } from "@/proxy";

const re = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it.each(["/", "/projects/abc", "/teams", "/apiary", "/signing", "/projects/signin", "/a.b/c"])(
    "guards %s",
    (p) => expect(re.test(p)).toBe(true),
  );
  it.each([
    "/signin",
    "/signin/x",
    "/api",
    "/api/x",
    "/api/auth/callback/keycloak",
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/logo.svg",
    "/img/a.PNG".toLowerCase(),
  ])("skips %s", (p) => expect(re.test(p)).toBe(false));
});
