import type { KeyboardEvent } from "react";
import type { Task } from "@/server/tasks";
import type { User } from "@/server/users";
import { BarTail } from "./BarTail";
import { BAR_HEIGHT, ROW_HEIGHT, estimateTextWidth } from "./layout";

export type BarProps = {
  task: Task;
  row: number;
  x: number;
  width: number;
  color: string;
  assignees: readonly User[];
  ariaLabel: string;
  onSelect?: (taskId: string) => void;
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

export function TaskBar({ task, row, x, width, color, assignees, ariaLabel, onSelect }: BarProps) {
  const y = row * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
  const mid = row * ROW_HEIGHT + ROW_HEIGHT / 2;
  const inside = estimateTextWidth(task.name) + 16 <= width;
  const progressWidth = (width * task.progress) / 100;

  return (
    <g
      tabIndex={0}
      role={onSelect ? "button" : "img"}
      aria-label={ariaLabel}
      className={`group outline-none ${onSelect ? "cursor-pointer" : ""}`}
      data-task-id={task.id}
      {...selectHandlers(task, onSelect)}
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
      <BarTail x={x + width + 6} row={row} assignees={assignees} label={inside ? undefined : task.name} />
    </g>
  );
}
