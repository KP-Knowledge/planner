import { ZodError } from "zod";
import { auth } from "@/auth";
import { ApiError } from "./errors";

export { ApiError };

export type AuthUser = { id: string };

export function withAuth<Ctx = { params: Promise<Record<string, string>> }>(
  handler: (req: Request, ctx: Ctx, user: AuthUser) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });

    try {
      return await handler(req, ctx, { id });
    } catch (err) {
      if (err instanceof ZodError) {
        return Response.json(
          { error: "validation", issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SyntaxError) {
        return Response.json({ error: "invalid_json" }, { status: 400 });
      }
      if (err instanceof ApiError) {
        return Response.json(
          err.message === err.code
            ? { error: err.code }
            : { error: err.code, message: err.message },
          { status: err.status },
        );
      }
      console.error(err);
      return Response.json({ error: "internal" }, { status: 500 });
    }
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed id can never exist, and Postgres would reject it with a 500.
export async function routeId(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new ApiError(404, "not_found");
  return id;
}
