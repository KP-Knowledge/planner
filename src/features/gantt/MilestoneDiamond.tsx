import { BarTail } from "./BarTail";
import { MILESTONE_SIZE, ROW_HEIGHT } from "./layout";
import { selectHandlers, type BarProps } from "./TaskBar";

/** `x` / `width` come from taskGeometry, so the diamond is centered in that box. */
export function MilestoneDiamond({
  task,
  row,
  x,
  width,
  color,
  assignees,
  ariaLabel,
  onSelect,
}: BarProps) {
  const cx = x + width / 2;
  const cy = row * ROW_HEIGHT + ROW_HEIGHT / 2;
  const half = MILESTONE_SIZE / 2;

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
        x={cx - half - 3}
        y={cy - half - 3}
        width={MILESTONE_SIZE + 6}
        height={MILESTONE_SIZE + 6}
        rx={3}
        transform={`rotate(45 ${cx} ${cy})`}
        fill="none"
        strokeWidth={2}
        className="pointer-events-none stroke-primary opacity-0 group-focus-visible:opacity-100"
      />
      <rect
        x={cx - half}
        y={cy - half}
        width={MILESTONE_SIZE}
        height={MILESTONE_SIZE}
        rx={2}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={color}
      />
      <BarTail x={x + width + 6} row={row} assignees={assignees} label={task.name} />
    </g>
  );
}
