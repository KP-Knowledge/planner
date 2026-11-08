import { MutationObserver, QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGanttCache, ganttKey, updateTaskOptions } from "@/features/gantt/cache";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";

function task(id: string, name: string): Task {
  return {
    id,
    sectionId: "s1",
    parentId: null,
    name,
    description: null,
    startDate: "2026-04-01",
    endDate: "2026-04-02",
    isMilestone: false,
    progress: 0,
    assigneeIds: [],
    sortOrder: 0,
  } as unknown as Task;
}

const server: GanttData = {
  tasks: [task("a", "a"), task("b", "b")],
  dependencies: [],
  holidays: [],
  sections: [],
  teams: [],
  users: [],
} as unknown as GanttData;

type Deferred = { resolve: (r: Response) => void };


describe("gantt cache with overlapping mutations", () => {
  const pending = new Map<string, Deferred[]>();
  let gets = 0;
  let qc: QueryClient;

  beforeEach(() => {
    pending.clear();
    gets = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (!init?.method || init.method === "GET") {
          gets++;
          return Promise.resolve(Response.json(structuredClone(server)));
        }
        return new Promise<Response>((resolve) => {
          pending.set(url, [...(pending.get(url) ?? []), { resolve }]);
        });
      }),
    );
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    qc.clear();
  });

  const flush = () => new Promise((r) => setTimeout(r, 0));
  const take = (url: string, which: "oldest" | "newest" = "oldest") =>
    which === "oldest" ? pending.get(url)!.shift()! : pending.get(url)!.pop()!;
  const fail = (url: string) => take(url).resolve(Response.json({ error: "boom" }, { status: 500 }));
  const ok = (url: string, tasks: Task[], which: "oldest" | "newest" = "oldest") =>
    take(url, which).resolve(Response.json({ tasks }));

  async function setup() {
    const { apiFetch } = await import("@/lib/api-client");
    const key = ganttKey("p1");
    const view = new QueryObserver(qc, {
      queryKey: key,
      queryFn: () => apiFetch<GanttData>("/api/projects/p1/gantt"),
    });
    const unsubscribe = view.subscribe(() => {});
    await flush();
    gets = 0;
    const notify = vi.fn();
    const cache = createGanttCache(qc, "p1", notify);
    const run = (id: string, name: string) => {
      const observer = new MutationObserver(qc, updateTaskOptions(cache));
      const promise = observer.mutate({ id, patch: { name } }).catch(() => undefined);
      return promise;
    };
    return { key, notify, run, unsubscribe };
  }

  it("refetches once after two overlapping failures instead of trusting a snapshot", async () => {
    const { key, notify, run, unsubscribe } = await setup();

    const first = run("a", "A edited");
    await flush();
    const second = run("b", "B edited");
    await flush();
    expect(qc.getQueryData<GanttData>(key)!.tasks.map((t) => t.name)).toEqual(["A edited", "B edited"]);

    fail("/api/tasks/a");
    await first;
    // Another edit is pending: no snapshot restore, so B's optimistic edit survives and nothing refetches yet.
    expect(qc.getQueryData<GanttData>(key)!.tasks.map((t) => t.name)).toEqual(["A edited", "B edited"]);
    expect(gets).toBe(0);

    fail("/api/tasks/b");
    await second;
    await flush();

    expect(gets).toBe(1);
    expect(qc.getQueryData<GanttData>(key)!.tasks.map((t) => t.name)).toEqual(["a", "b"]);
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("keeps the pending edit when the earlier one fails, then refetches", async () => {
    const { key, run, unsubscribe } = await setup();

    const first = run("a", "A edited");
    await flush();
    const second = run("b", "B edited");
    await flush();

    fail("/api/tasks/a");
    await first;
    expect(qc.getQueryData<GanttData>(key)!.tasks[1].name).toBe("B edited");

    ok("/api/tasks/b", [task("b", "B edited")]);
    await second;
    await flush();

    expect(gets).toBe(1);
    unsubscribe();
  });

  it("refetches only after the last of two overlapping successes settles", async () => {
    const { key, run, unsubscribe } = await setup();

    const first = run("a", "A1");
    await flush();
    const second = run("a", "A2");
    await flush();

    // The newer response arrives first; the older one must not be the final word.
    ok("/api/tasks/a", [task("a", "A2")], "newest");
    await second;
    expect(gets).toBe(0);

    ok("/api/tasks/a", [task("a", "A1")]);
    await first;
    await flush();

    expect(gets).toBe(1);
    expect(qc.getQueryData<GanttData>(key)!.tasks[0].name).toBe("a");
    unsubscribe();
  });

  it("restores the snapshot when a single mutation fails alone", async () => {
    const { key, run, unsubscribe } = await setup();
    const only = run("a", "A edited");
    await flush();
    expect(qc.getQueryData<GanttData>(key)!.tasks[0].name).toBe("A edited");
    fail("/api/tasks/a");
    await only;
    await flush();
    expect(qc.getQueryData<GanttData>(key)!.tasks[0].name).toBe("a");
    unsubscribe();
  });
});
