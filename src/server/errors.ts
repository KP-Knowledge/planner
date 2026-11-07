export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

// Drizzle wraps driver errors in DrizzleQueryError and keeps the original on `cause`.
export function isUniqueViolation(err: unknown): boolean {
  for (let e = err, depth = 0; e && typeof e === "object" && depth < 4; depth++) {
    if ((e as { code?: unknown }).code === "23505") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}
