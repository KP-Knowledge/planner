import { useQuery } from "@tanstack/react-query";
import { HttpError, apiFetch } from "@/lib/api-client";
import type { GanttData } from "@/server/projects";

export const ganttKey = (projectId: string) => ["gantt", projectId] as const;

export function useGantt(projectId: string) {
  return useQuery({
    queryKey: ganttKey(projectId),
    queryFn: () => apiFetch<GanttData>(`/api/projects/${projectId}/gantt`),
    retry: (count, err) => !(err instanceof HttpError && err.status === 404) && count < 2,
  });
}
