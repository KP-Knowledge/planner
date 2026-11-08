"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { btnSecondary } from "@/components/buttons";
import { HttpError } from "@/lib/api-client";
import { diffDays, todayInBangkok } from "@/lib/dates";
import type { GanttData } from "@/server/projects";
import { useGantt, useUpdateTask } from "./api";
import { GridPane } from "./GridPane";
import {
  GRID_WIDTH,
  PX_PER_DAY,
  childCounts,
  dateToX,
  holidayNameMap,
  timelineRange,
  visibleRows,
  xToDate,
  type Zoom,
} from "./layout";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TimelinePane } from "./TimelinePane";
import { Toolbar } from "./Toolbar";

const SHELL = "-m-6 flex h-[calc(100dvh-3.5rem)] flex-col";

export function GanttView({ projectId }: { projectId: string }) {
  const t = useTranslations("gantt");
  const tc = useTranslations("common");
  const { data, error, isPending, isError, refetch } = useGantt(projectId);

  if (isPending) {
    return <p className="p-6 text-sm text-muted">{tc("loading")}</p>;
  }
  if (isError) {
    if (error instanceof HttpError && error.status === 404) {
      return (
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("notFoundBody")}</p>
          <Link href="/" className={`${btnSecondary} mt-6`}>
            {t("back")}
          </Link>
        </div>
      );
    }
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-danger">
          {tc("error")}
        </p>
        <button type="button" onClick={() => refetch()} className={`${btnSecondary} mt-3`}>
          {tc("retry")}
        </button>
      </div>
    );
  }
  return <GanttChart data={data} />;
}

function GanttChart({ data }: { data: GanttData }) {
  const t = useTranslations("gantt");
  const [zoom, setZoom] = useState<Zoom>("day");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [today] = useState(() => todayInBangkok());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const updateTask = useUpdateTask(data.project.id);
  const selectedTask = useMemo(
    () => (selectedId ? (data.tasks.find((x) => x.id === selectedId) ?? null) : null),
    [data.tasks, selectedId],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const centerDate = useRef<string | null>(null);
  const didInitialScroll = useRef(false);

  const { origin, end } = useMemo(() => timelineRange(data.tasks, today), [data.tasks, today]);
  const editable = data.project.archivedAt === null;
  const rows = useMemo(() => visibleRows(data, collapsed, { editable }), [data, collapsed, editable]);
  const holidayNames = useMemo(() => holidayNameMap(data.holidays), [data.holidays]);
  const holidaySet = useMemo(() => new Set(data.holidays.map((h) => h.date)), [data.holidays]);
  const usersById = useMemo(() => new Map(data.users.map((u) => [u.id, u])), [data.users]);
  const teamsById = useMemo(() => new Map(data.teams.map((tm) => [tm.id, tm])), [data.teams]);
  const counts = useMemo(() => childCounts(data), [data]);

  const timelineWidth = (diffDays(origin, end) + 1) * PX_PER_DAY[zoom];

  const scrollToDate = (date: string, z: Zoom, smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const visible = el.clientWidth - GRID_WIDTH;
    const left = dateToX(date, origin, z) + PX_PER_DAY[z] / 2 - visible / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "instant" });
  };

  useLayoutEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    scrollToDate(today, zoom, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (centerDate.current === null) return;
    scrollToDate(centerDate.current, zoom, false);
    centerDate.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const changeZoom = (next: Zoom) => {
    if (next === zoom) return;
    const el = scrollRef.current;
    if (el) {
      const visible = el.clientWidth - GRID_WIDTH;
      centerDate.current = xToDate(el.scrollLeft + visible / 2, origin, zoom);
    }
    setZoom(next);
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className={SHELL}>
      <Toolbar
        name={data.project.name}
        archived={data.project.archivedAt !== null}
        zoom={zoom}
        onZoom={changeZoom}
        onToday={() => scrollToDate(today, zoom, true)}
      />
      {data.sections.length === 0 ? (
        <p className="p-6 text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div ref={scrollRef} className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-card">
            <div className="flex" style={{ width: GRID_WIDTH + timelineWidth }}>
              <GridPane
                projectId={data.project.id}
                data={data}
                editable={editable}
                rows={rows}
                collapsed={collapsed}
                counts={counts}
                usersById={usersById}
                holidaySet={holidaySet}
                selectedId={selectedTask?.id}
                onToggle={toggle}
                onSelect={setSelectedId}
              />
              <TimelinePane
                data={data}
                holidaySet={holidaySet}
                onCommitDates={(id, dates) => updateTask.mutateAsync({ id, patch: dates })}
                rows={rows}
                origin={origin}
                end={end}
                zoom={zoom}
                today={today}
                holidayNames={holidayNames}
                dependencies={data.dependencies}
                teamsById={teamsById}
                usersById={usersById}
                onSelect={setSelectedId}
                editable={editable}
              />
            </div>
          </div>
          {selectedTask && (
            <TaskDetailPanel
              projectId={data.project.id}
              task={selectedTask}
              teams={data.teams}
              users={data.users}
              editable={editable}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
