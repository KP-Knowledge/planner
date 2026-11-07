export const DEFAULT_TASK_COLOR = "#4F46E5";

export function resolveTaskColor(
  task: { color: string | null },
  team: { color: string } | null,
): string {
  return task.color ?? team?.color ?? DEFAULT_TASK_COLOR;
}
