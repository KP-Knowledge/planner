import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...a: unknown[]) => authMock(...a) }));

import { ApiError, withAuth } from "@/server/http";

const req = new Request("http://localhost/api/x");
const ctx = { params: Promise.resolve({}) };

describe("withAuth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("401 without session and does not call handler", async () => {
    authMock.mockResolvedValue(null);
    const handler = vi.fn();
    const res = await withAuth(handler)(req, ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("401 when session has no user id", async () => {
    authMock.mockResolvedValue({ user: {} });
    const res = await withAuth(vi.fn())(req, ctx);
    expect(res.status).toBe(401);
  });

  it("passes user to handler", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await withAuth(async (_r, _c, user) => Response.json({ id: user.id }))(req, ctx);
    expect(await res.json()).toEqual({ id: "u1" });
  });

  it("ZodError -> 400 validation with issues", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await withAuth(async () => {
      z.object({ a: z.string() }).parse({});
      return Response.json({});
    })(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation");
    expect(body.issues).toHaveLength(1);
  });

  it("ApiError -> its status and code", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await withAuth(async () => {
      throw new ApiError(409, "cycle", "would create a cycle");
    })(req, ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "cycle", message: "would create a cycle" });
  });

  it("ApiError without message -> only { error: code }", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await withAuth(async () => {
      throw new ApiError(404, "not_found");
    })(req, ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("malformed JSON body -> 400 invalid_json", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const bad = new Request("http://localhost/api/x", { method: "POST", body: "{nope" });
    const res = await withAuth(async (r) => Response.json(await r.json()))(bad, ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("unknown error -> 500 internal without details", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await withAuth(async () => {
      throw new Error("secret db detail");
    })(req, ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal" });
    expect(spy).toHaveBeenCalled();
  });
});
