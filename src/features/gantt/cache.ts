import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { GanttData } from "@/server/projects";
import type { Task } from "@/server/tasks";
import { applyPatch, applyTaskUpdate, type TaskPatchInput } from "./optimistic";

export const ganttKey = (projectId: string) => ["gantt", projectId] as const;
export const ganttMutationKey = (projectId: string) => ["gantt-mutation", projectId] as const;

export type FailKey = "saveFailed" | "createFailed" | "deleteFailed" | "orderFailed";

/**
 * Optimistic plumbing shared by every gantt mutation.
 *
 * All mutations carry one `mutationKey`. Rollback and refetch only happen when the settling mutation is the
 * only one in flight: restoring a snapshot while another edit is pending would resurrect a failed edit or
 * wipe the pending one, and an older PATCH response may land after a newer one. The last mutation to settle
 * invalidates the query, so the cache ends up matching the server.
 */
export function createGanttCache(
  qc: QueryClient,
  projectId: string,
  notify: (err: unknown, fallbackKey: FailKey) => void,
) {
  const key = ganttKey(projectId);
  const mutationKey = ganttMutationKey(projectId);
  // Inside onError/onSettled the settling mutation is still pending, so it counts itself.
  const isLast = () => qc.isMutating({ mutationKey }) <= 1;

  const update = (fn: (d: GanttData) => GanttData) =>
    qc.setQueryData<GanttData>(key, (d) => (d ? fn(d) : d));

  const settled = () => {
    if (isLast()) void qc.invalidateQueries({ queryKey: key });
  };

  return {
    update,
    mutationKey,
    settled,
    /** Options every gantt mutation spreads in. */
    shared: { mutationKey, onSettled: settled },
    async begin(optimistic?: (d: GanttData) => GanttData) {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GanttData>(key);
      if (optimistic) update(optimistic);
      return { prev };
    },
    rollback(ctx: { prev?: GanttData } | undefined) {
      if (ctx?.prev && isLast()) qc.setQueryData(key, ctx.prev);
    },
    fail: notify,
  };
}

export type GanttCache = ReturnType<typeof createGanttCache>;

export function updateTaskOptions(c: GanttCache) {
  return {
    ...c.shared,
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatchInput }) =>
      apiFetch<{ tasks: Task[] }>(`/api/tasks/${id}`, { method: "PATCH", json: patch }),
    onMutate: ({ id, patch }: { id: string; patch: TaskPatchInput }) =>
      c.begin((d) => applyPatch(d, id, patch)),
    onError: (err: unknown, _v: unknown, ctx: { prev?: GanttData } | undefined) => {
      c.rollback(ctx);
      c.fail(err, "saveFailed");
    },
    onSuccess: ({ tasks }: { tasks: Task[] }) => c.update((d) => applyTaskUpdate(d, tasks)),
  };
}
