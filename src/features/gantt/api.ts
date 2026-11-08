import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast";
import { HttpError, apiFetch } from "@/lib/api-client";
import type { Dependency } from "@/server/dependencies";
import type { GanttData } from "@/server/projects";
import type { Section } from "@/server/sections";
import type { Task } from "@/server/tasks";
import { createGanttCache, ganttKey, updateTaskOptions } from "./cache";
import { applyOrder, applyTaskUpdate, removeTask, type OrderPayload } from "./optimistic";

export { ganttKey };

export function useGantt(projectId: string) {
  return useQuery({
    queryKey: ganttKey(projectId),
    queryFn: () => apiFetch<GanttData>(`/api/projects/${projectId}/gantt`),
    retry: (count, err) => !(err instanceof HttpError && err.status === 404) && count < 2,
  });
}

function useGanttCache(projectId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations("gantt");
  return createGanttCache(qc, projectId, (err, fallbackKey) => {
    if (err instanceof HttpError && err.code === "cycle") toast(t("cycleError"), "error");
    else if (err instanceof HttpError && err.code === "duplicate") toast(t("duplicateError"), "error");
    else toast(t(fallbackKey), "error");
  });
}

export function useUpdateTask(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation(updateTaskOptions(c));
}

export type CreateTaskInput = {
  sectionId?: string;
  parentId?: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isMilestone?: boolean;
};

export function useCreateTask(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (input: CreateTaskInput) =>
      apiFetch<Task>("/api/tasks", { method: "POST", json: input }),
    onError: (err) => c.fail(err, "createFailed"),
    onSuccess: (task) => c.update((d) => ({ ...d, tasks: [...d.tasks, task] })),
  });
}

export function useDeleteTask(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (id: string) => apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onMutate: (id) => c.begin((d) => removeTask(d, id)),
    onError: (err, _id, ctx) => {
      c.rollback(ctx);
      c.fail(err, "deleteFailed");
    },
  });
}

export function useCreateDependency(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (input: { predecessorId: string; successorId: string }) =>
      apiFetch<{ dependency: Dependency; tasks: Task[] }>("/api/dependencies", {
        method: "POST",
        json: input,
      }),
    onError: (err) => c.fail(err, "createFailed"),
    onSuccess: ({ dependency, tasks }) =>
      c.update((d) => {
        const next = applyTaskUpdate(d, tasks);
        return next.dependencies.some((x) => x.id === dependency.id)
          ? next
          : { ...next, dependencies: [...next.dependencies, dependency] };
      }),
  });
}

export function useDeleteDependency(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (id: string) => apiFetch<void>(`/api/dependencies/${id}`, { method: "DELETE" }),
    onMutate: (id) =>
      c.begin((d) => ({ ...d, dependencies: d.dependencies.filter((x) => x.id !== id) })),
    onError: (err, _id, ctx) => {
      c.rollback(ctx);
      c.fail(err, "deleteFailed");
    },
  });
}

export function useReorder(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (sections: OrderPayload) =>
      apiFetch<void>(`/api/projects/${projectId}/order`, { method: "PUT", json: { sections } }),
    onMutate: (sections) => c.begin((d) => applyOrder(d, sections)),
    onError: (err, _v, ctx) => {
      c.rollback(ctx);
      c.fail(err, "orderFailed");
    },
  });
}

export function useCreateSection(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (name: string) =>
      apiFetch<Section>("/api/sections", { method: "POST", json: { projectId, name } }),
    onError: (err) => c.fail(err, "createFailed"),
    onSuccess: (section) => c.update((d) => ({ ...d, sections: [...d.sections, section] })),
  });
}

export function useRenameSection(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<Section>(`/api/sections/${id}`, { method: "PATCH", json: { name } }),
    onMutate: ({ id, name }) =>
      c.begin((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, name } : s)) })),
    onError: (err, _v, ctx) => {
      c.rollback(ctx);
      c.fail(err, "saveFailed");
    },
  });
}

export function useDeleteSection(projectId: string) {
  const c = useGanttCache(projectId);
  return useMutation({
    ...c.shared,
    mutationFn: (id: string) => apiFetch<void>(`/api/sections/${id}`, { method: "DELETE" }),
    onMutate: (id) =>
      c.begin((d) => {
        const gone = new Set(d.tasks.filter((t) => t.sectionId === id).map((t) => t.id));
        return {
          ...d,
          sections: d.sections.filter((s) => s.id !== id),
          tasks: d.tasks.filter((t) => !gone.has(t.id)),
          dependencies: d.dependencies.filter(
            (x) => !gone.has(x.predecessorId) && !gone.has(x.successorId),
          ),
        };
      }),
    onError: (err, _id, ctx) => {
      c.rollback(ctx);
      c.fail(err, "deleteFailed");
    },
  });
}
