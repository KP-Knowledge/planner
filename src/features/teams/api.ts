import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Team } from "@/server/teams";

export const teamsKey = ["teams"] as const;

export function useTeams() {
  return useQuery({
    queryKey: teamsKey,
    queryFn: () => apiFetch<Team[]>("/api/teams"),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: teamsKey });
}

export function useCreateTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      apiFetch<Team>("/api/teams", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string }) =>
      apiFetch<Team>(`/api/teams/${id}`, { method: "PATCH", json: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/teams/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
