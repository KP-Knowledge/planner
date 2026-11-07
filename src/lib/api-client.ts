export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

export type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

export async function apiFetch<T>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    throw new HttpError(res.status, body?.error ?? "request_failed", body?.message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
