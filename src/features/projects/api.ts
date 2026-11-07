import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Project } from "@/server/projects";

export const projectsKey = (archived: boolean) => ["projects", { archived }] as const;

export function useProjects(archived: boolean) {
  return useQuery({
    queryKey: projectsKey(archived),
    queryFn: () => apiFetch<Project[]>(`/api/projects?archived=${archived}`),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["projects"] });
}

export function useCreateProject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      apiFetch<Project>("/api/projects", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      description?: string | null;
      archived?: boolean;
    }) => apiFetch<Project>(`/api/projects/${id}`, { method: "PATCH", json: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
