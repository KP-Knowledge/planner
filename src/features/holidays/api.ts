import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast";
import { HttpError, apiFetch } from "@/lib/api-client";
import type { Holiday } from "@/server/projects";
import { ganttKey, ganttMutationKey } from "../gantt/cache";

export const holidaysKey = (year: number, projectId: string) => ["holidays", year, projectId] as const;

export function useHolidays(year: number, projectId: string) {
  return useQuery({
    queryKey: holidaysKey(year, projectId),
    queryFn: () => apiFetch<Holiday[]>(`/api/holidays?year=${year}&projectId=${projectId}`),
    placeholderData: keepPreviousData,
  });
}

/**
 * Holiday mutations are not optimistic. They carry the gantt mutationKey so the gantt refetch waits for the last
 * in-flight mutation, same as task edits. Invalidating the `["holidays"]` prefix covers `["holidays", year]`.
 */
function useHolidayMutationOptions(projectId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations("holidays");
  const mutationKey = ganttMutationKey(projectId);
  return {
    shared: {
      mutationKey,
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: ["holidays"] });
        if (qc.isMutating({ mutationKey }) <= 1) void qc.invalidateQueries({ queryKey: ganttKey(projectId) });
      },
    },
    fail: (err: unknown, fallback: "saveFailed" | "importFailed" = "saveFailed") =>
      toast(err instanceof HttpError && err.code === "duplicate" ? t("duplicate") : t(fallback), "error"),
  };
}

export type HolidayCreateInput = { date: string; name: string; projectId?: string };

export function useCreateHoliday(projectId: string) {
  const { fail, shared } = useHolidayMutationOptions(projectId);
  return useMutation({
    ...shared,
    mutationFn: (input: HolidayCreateInput) =>
      apiFetch<Holiday>("/api/holidays", { method: "POST", json: input }),
    onError: (err) => fail(err),
  });
}

export function useUpdateHoliday(projectId: string) {
  const { fail, shared } = useHolidayMutationOptions(projectId);
  return useMutation({
    ...shared,
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; date?: string } }) =>
      apiFetch<Holiday>(`/api/holidays/${id}`, { method: "PATCH", json: patch }),
    onError: (err) => fail(err),
  });
}

/** No error toast: the confirm dialog that triggers this shows its own error. */
export function useDeleteHoliday(projectId: string) {
  const { shared } = useHolidayMutationOptions(projectId);
  return useMutation({
    ...shared,
    mutationFn: (id: string) => apiFetch<void>(`/api/holidays/${id}`, { method: "DELETE" }),
  });
}

export function useImportHolidays(projectId: string) {
  const { fail, shared } = useHolidayMutationOptions(projectId);
  const toast = useToast();
  const t = useTranslations("holidays");
  return useMutation({
    ...shared,
    mutationFn: (year: number) =>
      apiFetch<{ inserted: number }>("/api/holidays/import", { method: "POST", json: { year } }),
    onSuccess: ({ inserted }) => toast(t("imported", { count: inserted })),
    onError: (err) => fail(err, "importFailed"),
  });
}
