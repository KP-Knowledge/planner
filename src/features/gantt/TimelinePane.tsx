import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { diffDays, type ISODate } from "@/lib/dates";
import type { HolidaySet } from "@/lib/workdays";
import type { GanttData } from "@/server/projects";
import { resolveTaskColor } from "@/lib/color";
import type { Dependency } from "@/server/dependencies";
import type { Team } from "@/server/teams";
import { resolveAssignees, type AvatarUser } from "./avatar";
import { AVATAR_CLIP_ID } from "./Avatars";
import { DependencyDefs, DependencyLayer, type BarPosition } from "./DependencyLayer";
import { useTaskFormat } from "./format";
import {
  PX_PER_DAY,
  ROW_HEIGHT,
  dateToX,
  nonWorkingDays,
  taskGeometry,
  type Row,
  type Zoom,
} from "./layout";
import { MilestoneDiamond } from "./MilestoneDiamond";
import { TaskBar } from "./TaskBar";
import { TimeScale } from "./TimeScale";
import { TodayLine } from "./TodayLine";
import { useBarDrag } from "./useBarDrag";

const ROW_LINES_ID = "gantt-row-lines";
const DAY_LINES_ID = "gantt-day-lines";

export function TimelinePane({
  data,
  holidaySet,
  onCommitDates,
  rows,
  origin,
  end,
  zoom,
  today,
  holidayNames,
  dependencies,
  teamsById,
  usersById,
  onSelect,
}: {
  data: GanttData;
  holidaySet: HolidaySet;
  onCommitDates: (taskId: string, dates: { startDate: ISODate; endDate: ISODate }) => Promise<unknown> | void;
  rows: readonly Row[];
  origin: ISODate;
  end: ISODate;
  zoom: Zoom;
  today: ISODate;
  holidayNames: ReadonlyMap<ISODate, string[]>;
  dependencies: readonly Dependency[];
  teamsById: ReadonlyMap<string, Team>;
  usersById: ReadonlyMap<string, AvatarUser>;
  onSelect?: (taskId: string) => void;
}) {
  const t = useTranslations("gantt");
  const { taskLabel } = useTaskFormat();
  const px = PX_PER_DAY[zoom];
  const { preview, bindings } = useBarDrag({
    data,
    origin,
    zoom,
    holidays: holidaySet,
    onSelect,
    onCommit: onCommitDates,
  });
  const width = (diffDays(origin, end) + 1) * px;
  const height = rows.length * ROW_HEIGHT;

  const shaded = useMemo(
    () => nonWorkingDays(origin, end, holidayNames),
    [origin, end, holidayNames],
  );

  const positions = useMemo(() => {
    const map = new Map<string, BarPosition>();
    rows.forEach((row, i) => {
      if (row.kind !== "task") return;
      const g = taskGeometry(preview?.get(row.task.id) ?? row.task, origin, zoom);
      map.set(row.task.id, { x: g.x, width: g.width, row: i });
    });
    return map;
  }, [rows, origin, zoom, preview]);

  const todayInRange = today >= origin && today <= end;
  const todayX = dateToX(today, origin, zoom) + px / 2;

  return (
    <div className="shrink-0" style={{ width }}>
      <div className="sticky top-0 z-10">
        <TimeScale origin={origin} end={end} zoom={zoom} />
      </div>
      <svg
        width={width}
        height={height}
        role="group"
        aria-label={t("timelineLabel")}
        className="block"
      >
      <defs>
        <DependencyDefs />
        <clipPath id={AVATAR_CLIP_ID} clipPathUnits="objectBoundingBox">
          <circle cx={0.5} cy={0.5} r={0.5} />
        </clipPath>
        <pattern id={ROW_LINES_ID} width={width} height={ROW_HEIGHT} patternUnits="userSpaceOnUse">
          <line
            x1={0}
            x2={width}
            y1={ROW_HEIGHT - 0.5}
            y2={ROW_HEIGHT - 0.5}
            className="stroke-border"
            strokeWidth={1}
          />
        </pattern>
        {zoom === "day" && (
          <pattern id={DAY_LINES_ID} width={px} height={height || 1} patternUnits="userSpaceOnUse">
            <line x1={0.5} x2={0.5} y1={0} y2={height || 1} className="stroke-border" strokeOpacity={0.5} />
          </pattern>
        )}
      </defs>

      {zoom === "day" && <rect width={width} height={height} fill={`url(#${DAY_LINES_ID})`} />}

      {shaded.map((d) => (
        <rect
          key={d.date}
          x={dateToX(d.date, origin, zoom)}
          y={0}
          width={px}
          height={height}
          fill={d.holidays.length > 0 ? "var(--color-warning)" : "var(--color-muted)"}
          fillOpacity={d.holidays.length > 0 ? 0.2 : 0.1}
        >
          {d.holidays.length > 0 && <title>{d.holidays.join(", ")}</title>}
        </rect>
      ))}

      {rows.map((row, i) =>
        row.kind === "section" ? (
          <rect
            key={`s:${row.section.id}`}
            x={0}
            y={i * ROW_HEIGHT}
            width={width}
            height={ROW_HEIGHT}
            className="pointer-events-none fill-surface"
            fillOpacity={0.6}
          />
        ) : null,
      )}

      <rect width={width} height={height} fill={`url(#${ROW_LINES_ID})`} className="pointer-events-none" />

      {todayInRange && <TodayLine x={todayX} height={height} />}

      <DependencyLayer dependencies={dependencies} positions={positions} />

      {rows.map((row, i) => {
        if (row.kind !== "task") return null;
        const { depth } = row;
        const task = preview?.get(row.task.id) ?? row.task;
        const g = taskGeometry(task, origin, zoom);
        const team = task.teamId ? (teamsById.get(task.teamId) ?? null) : null;
        const props = {
          task,
          row: i,
          x: g.x,
          width: g.width,
          color: resolveTaskColor(task, team),
          assignees: resolveAssignees(task.assigneeIds, usersById),
          ariaLabel: taskLabel(task, depth),
          onSelect,
          bind: bindings(task.id),
        };
        return task.isMilestone ? (
          <MilestoneDiamond key={task.id} {...props} />
        ) : (
          <TaskBar key={task.id} {...props} />
        );
      })}
      </svg>
    </div>
  );
}

