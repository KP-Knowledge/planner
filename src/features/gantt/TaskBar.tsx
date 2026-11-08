import type { KeyboardEvent } from "react";
import type { Task } from "@/server/tasks";
import type { AvatarUser } from "./avatar";
import { BarTail } from "./BarTail";
import { BAR_HEIGHT, ROW_HEIGHT, estimateTextWidth } from "./layout";
import { LinkHandle } from "./LinkHandle";
import type { BarBindings, PointerHandlers } from "./useBarDrag";

export const HANDLE_WIDTH = 6;
const NO_SCROLL = { touchAction: "none" } as const;

export type BarProps = {
  task: Task;
  row: number;
  x: number;
  width: number;
  color: string;
  assignees: readonly AvatarUser[];
  ariaLabel: string;
  onSelect?: (taskId: string) => void;
  /** Drag, resize and keyboard handlers. Without them the bar only supports select. */
  bind?: BarBindings;
  /** Pointer handlers for the dependency handle at the right edge. */
  link?: PointerHandlers;
};

export function selectHandlers(task: Task, onSelect?: (taskId: string) => void) {
  if (!onSelect) return {};
  return {
    onClick: () => onSelect(task.id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(task.id);
      }
    },
  };
}

export function TaskBar({ task, row, x, width, color, assignees, ariaLabel, onSelect, bind, link }: BarProps) {
  const y = row * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
  const mid = row * ROW_HEIGHT + ROW_HEIGHT / 2;
  const inside = estimateTextWidth(task.name) + 16 <= width;
  const progressWidth = (width * task.progress) / 100;
  const handle = Math.min(HANDLE_WIDTH, width / 3);

  return (
    <g
      tabIndex={0}
      role={onSelect ? "button" : "img"}
      aria-label={ariaLabel}
      className={`group outline-none ${onSelect ? "cursor-pointer" : ""}`}
      data-task-id={task.id}
      {...(bind ? { onKeyDown: bind.onKeyDown } : selectHandlers(task, onSelect))}
    >
      <title>{ariaLabel}</title>
      <rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={BAR_HEIGHT + 4}
        rx={6}
        fill="none"
        strokeWidth={2}
        className="pointer-events-none stroke-primary opacity-0 group-focus-visible:opacity-100"
      />
      <rect x={x} y={y} width={width} height={BAR_HEIGHT} rx={4} fill={color} fillOpacity={0.4} />
      {progressWidth > 0 && (
        <rect x={x} y={y} width={progressWidth} height={BAR_HEIGHT} rx={4} fill={color} />
      )}
      {inside && (
        <text
          x={x + 8}
          y={mid}
          dominantBaseline="central"
          fontSize={12}
          fontWeight={500}
          fill="#fff"
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          className="pointer-events-none"
        >
          {task.name}
        </text>
      )}
      {bind && (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={BAR_HEIGHT}
            rx={4}
            fill="transparent"
            className="cursor-grab active:cursor-grabbing"
            style={NO_SCROLL}
            {...bind.move}
          />
          {[
            { key: "start", hx: x, h: bind.resizeStart },
            { key: "end", hx: x + width - handle, h: bind.resizeEnd },
          ].map(({ key, hx, h }) => (
            <rect
              key={key}
              x={hx}
              y={y}
              width={handle}
              height={BAR_HEIGHT}
              rx={2}
              fill="#fff"
              fillOpacity={0.55}
              className="cursor-ew-resize opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              style={NO_SCROLL}
              {...h}
            />
          ))}
        </>
      )}
      <BarTail x={x + width + 6} row={row} assignees={assignees} label={inside ? undefined : task.name} />
      {link && <LinkHandle edge={x + width} row={row} handlers={link} />}
    </g>
  );
}
