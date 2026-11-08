import { describe, expect, it, vi } from "vitest";
import { HttpError, createUnauthorizedHandler } from "@/lib/api-client";

describe("createUnauthorizedHandler", () => {
  it("redirects to /signin once on 401", () => {
    const redirect = vi.fn();
    const handle = createUnauthorizedHandler(redirect);
    handle(new HttpError(401, "unauthorized"));
    handle(new HttpError(401, "unauthorized"));
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/signin");
  });

  it("ignores other errors", () => {
    const redirect = vi.fn();
    const handle = createUnauthorizedHandler(redirect);
    handle(new HttpError(403, "forbidden"));
    handle(new HttpError(500, "boom"));
    handle(new Error("network"));
    handle(undefined);
    expect(redirect).not.toHaveBeenCalled();
  });
});
