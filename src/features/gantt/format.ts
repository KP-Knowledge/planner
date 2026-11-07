import { useFormatter, useTranslations } from "next-intl";
import type { ISODate } from "@/lib/dates";
import type { Task } from "@/server/tasks";

/** UTC midnight for an ISODate. Format with `timeZone: "UTC"` so the day never shifts. */
export function utcDate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function useTaskFormat() {
  const format = useFormatter();
  const t = useTranslations("gantt");
  const date = (d: ISODate) =>
    format.dateTime(utcDate(d), { dateStyle: "medium", timeZone: "UTC" });
  const taskLabel = (task: Task, depth: 0 | 1) => {
    if (task.isMilestone) {
      return t("milestoneLabel", { name: task.name, date: date(task.startDate) });
    }
    return t(depth === 1 ? "subtaskLabel" : "taskLabel", {
      name: task.name,
      start: date(task.startDate),
      end: date(task.endDate),
      progress: task.progress,
    });
  };
  return { date, taskLabel };
}
