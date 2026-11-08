import { useFormatter, useTranslations } from "next-intl";
import { addDays, dayOfWeek, type ISODate } from "@/lib/dates";
import type { Holiday } from "@/server/projects";
import { utcDate } from "../gantt/format";
import { monthGrid } from "./monthLayout";

const SUNDAY = "2023-12-31";
const BOTH_STYLE = { background: "linear-gradient(135deg, var(--color-primary) 50%, var(--color-accent) 50%)" };

export function MonthGrid({
  year,
  month,
  holidaysByDate,
  selected,
  onSelect,
}: {
  year: number;
  month: number;
  holidaysByDate: ReadonlyMap<ISODate, readonly Holiday[]>;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
}) {
  const format = useFormatter();
  const t = useTranslations("holidays");
  const weeks = monthGrid(year, month);
  const title = format.dateTime(new Date(Date.UTC(year, month - 1, 1)), { month: "long", timeZone: "UTC" });

  return (
    <section aria-label={title}>
      <h4 className="mb-1 text-sm font-medium">{title}</h4>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>
            {format.dateTime(utcDate(addDays(SUNDAY, i)), { weekday: "narrow", timeZone: "UTC" })}
          </span>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {weeks.flat().map((date, i) => {
          if (date === null) return <span key={`pad-${i}`} />;
          const hs = holidaysByDate.get(date) ?? [];
          const org = hs.some((h) => h.projectId === null);
          const project = hs.some((h) => h.projectId !== null);
          const dow = dayOfWeek(date);
          const tone =
            org && project
              ? "text-white"
              : org
                ? "bg-primary text-white"
                : project
                  ? "bg-accent text-white"
                  : dow === 0 || dow === 6
                    ? "bg-surface text-muted hover:bg-border"
                    : "hover:bg-surface";
          const label = format.dateTime(utcDate(date), { dateStyle: "medium", timeZone: "UTC" });
          const names = hs.map((h) => h.name).join(", ");
          return (
            <button
              key={date}
              type="button"
              aria-pressed={selected === date}
              aria-label={hs.length > 0 ? t("dayWithHolidays", { date: label, names }) : label}
              title={names || undefined}
              style={org && project ? BOTH_STYLE : undefined}
              onClick={() => onSelect(date)}
              className={`h-8 rounded text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-pressed:ring-2 aria-pressed:ring-text aria-pressed:ring-offset-1 aria-pressed:ring-offset-card ${tone}`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </section>
  );
}
