import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { dayOfWeek, diffDays, type ISODate } from "@/lib/dates";
import { utcDate } from "./format";
import { HEADER_ROW_HEIGHT, PX_PER_DAY, headerSegments, isoWeek, type Zoom } from "./layout";

export function TimeScale({ origin, end, zoom }: { origin: ISODate; end: ISODate; zoom: Zoom }) {
  const format = useFormatter();
  const t = useTranslations("gantt");
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
    if (zoom === "week") return t("weekShort", { n: isoWeek(d) });
    if (zoom === "month") return format.dateTime(utcDate(d), { month: "short", timeZone: "UTC" });
    return `${Number(d.slice(8))} ${format.dateTime(utcDate(d), { weekday: "narrow", timeZone: "UTC" })}`;
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
          return (
            <div
              key={s.date}
              className={`${cell} ${weekend ? "bg-surface text-muted" : "text-muted"} ${zoom === "day" ? "text-center" : ""}`}
              style={{ left: s.x, width: s.width }}
            >
              {bottomLabel(s.date)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
