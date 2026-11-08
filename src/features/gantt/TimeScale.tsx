import { useFormatter } from "next-intl";
import { useMemo } from "react";
import { dayOfWeek, diffDays, type ISODate } from "@/lib/dates";
import { utcDate } from "./format";
import { HEADER_ROW_HEIGHT, PX_PER_DAY, headerSegments, weekStart, type Zoom } from "./layout";

export function TimeScale({
  origin,
  end,
  zoom,
  holidayNames,
  onDayClick,
}: {
  origin: ISODate;
  end: ISODate;
  zoom: Zoom;
  holidayNames?: ReadonlyMap<ISODate, string[]>;
  /** Day zoom only. The cells become buttons. */
  onDayClick?: (date: ISODate, anchor: HTMLElement) => void;
}) {
  const format = useFormatter();
  const { top, bottom } = useMemo(() => headerSegments(origin, end, zoom), [origin, end, zoom]);
  const width = (diffDays(origin, end) + 1) * PX_PER_DAY[zoom];

  const topLabel = (d: ISODate) =>
    zoom === "month"
      ? format.dateTime(utcDate(d), { year: "numeric", timeZone: "UTC" })
      : format.dateTime(utcDate(d), {
          month: "long",
          ...(zoom === "day" ? { year: "numeric" as const } : {}),
          timeZone: "UTC",
        });

  const bottomLabel = (d: ISODate) => {
    if (zoom === "week") return format.dateTime(utcDate(weekStart(d)), { month: "short", day: "numeric", timeZone: "UTC" });
    if (zoom === "month") return format.dateTime(utcDate(d), { month: "short", timeZone: "UTC" });
    return `${Number(d.slice(8))} ${format.dateTime(utcDate(d), { weekday: "narrow", timeZone: "UTC" })}`;
  };

  const dayLabel = (d: ISODate, names?: string[]) => {
    const label = format.dateTime(utcDate(d), { dateStyle: "medium", timeZone: "UTC" });
    return names ? `${label}: ${names.join(", ")}` : label;
  };

  const cell = "absolute overflow-hidden whitespace-nowrap border-l border-border px-1.5 text-xs leading-7";

  return (
    <div className="relative border-b border-border bg-card" style={{ width, height: HEADER_ROW_HEIGHT * 2 }}>
      <div className="relative border-b border-border" style={{ height: HEADER_ROW_HEIGHT }}>
        {top.map((s) => (
          <div key={s.date} className={`${cell} font-medium text-text`} style={{ left: s.x, width: s.width }}>
            {topLabel(s.date)}
          </div>
        ))}
      </div>
      <div className="relative" style={{ height: HEADER_ROW_HEIGHT }}>
        {bottom.map((s) => {
          const dow = dayOfWeek(s.date);
          const weekend = zoom === "day" && (dow === 0 || dow === 6);
          const names = zoom === "day" ? holidayNames?.get(s.date) : undefined;
          const tone = names ? "bg-warning/20 text-text" : weekend ? "bg-surface text-muted" : "text-muted";
          const className = `${cell} ${tone} ${zoom === "day" ? "text-center" : ""}`;
          if (zoom === "day" && onDayClick) {
            return (
              <button
                key={s.date}
                type="button"
                title={names?.join(", ")}
                aria-label={dayLabel(s.date, names)}
                onClick={(e) => onDayClick(s.date, e.currentTarget)}
                className={`${className} cursor-pointer hover:bg-surface focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
                style={{ left: s.x, width: s.width }}
              >
                {bottomLabel(s.date)}
              </button>
            );
          }
          return (
            <div key={s.date} className={className} style={{ left: s.x, width: s.width }}>
              {bottomLabel(s.date)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
