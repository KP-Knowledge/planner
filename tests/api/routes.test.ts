import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...a: unknown[]) => authMock(...a) }));

import * as projects from "@/app/api/projects/route";
import * as project from "@/app/api/projects/[id]/route";
import * as gantt from "@/app/api/projects/[id]/gantt/route";
import * as order from "@/app/api/projects/[id]/order/route";
import * as sections from "@/app/api/sections/route";
import * as section from "@/app/api/sections/[id]/route";
import * as tasks from "@/app/api/tasks/route";
import * as task from "@/app/api/tasks/[id]/route";
import * as deps from "@/app/api/dependencies/route";
import * as dep from "@/app/api/dependencies/[id]/route";
import * as teams from "@/app/api/teams/route";
import * as team from "@/app/api/teams/[id]/route";
import * as users from "@/app/api/users/route";

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

const cases: [string, string, Handler][] = [
  ["GET", "/api/projects", projects.GET],
  ["POST", "/api/projects", projects.POST],
  ["PATCH", "/api/projects/x", project.PATCH],
  ["DELETE", "/api/projects/x", project.DELETE],
  ["GET", "/api/projects/x/gantt", gantt.GET],
  ["PUT", "/api/projects/x/order", order.PUT],
  ["POST", "/api/sections", sections.POST],
  ["PATCH", "/api/sections/x", section.PATCH],
  ["DELETE", "/api/sections/x", section.DELETE],
  ["POST", "/api/tasks", tasks.POST],
  ["PATCH", "/api/tasks/x", task.PATCH],
  ["DELETE", "/api/tasks/x", task.DELETE],
  ["POST", "/api/dependencies", deps.POST],
  ["DELETE", "/api/dependencies/x", dep.DELETE],
  ["GET", "/api/teams", teams.GET],
  ["POST", "/api/teams", teams.POST],
  ["PATCH", "/api/teams/x", team.PATCH],
  ["DELETE", "/api/teams/x", team.DELETE],
  ["GET", "/api/users", users.GET],
];

describe("api routes", () => {
  beforeEach(() => authMock.mockResolvedValue(null));

  it.each(cases)("%s %s → 401 without session", async (method, path, handler) => {
    const res = await handler(new Request(`http://localhost${path}`, { method }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("non-uuid id with a session → 404 not_found (never reaches the db)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await project.DELETE(new Request("http://localhost/api/projects/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("invalid body with a session → 400 validation", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const res = await projects.POST(
      new Request("http://localhost/api/projects", { method: "POST", body: JSON.stringify({ name: "" }) }),
      { params: Promise.resolve({ id: "" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation");
  });
});
