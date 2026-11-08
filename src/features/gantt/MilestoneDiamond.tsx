import { BarTail } from "./BarTail";
import { MILESTONE_SIZE, ROW_HEIGHT } from "./layout";
import { LinkHandle } from "./LinkHandle";
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
  bind,
  link,
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
      {...(bind ? { onKeyDown: bind.onKeyDown } : selectHandlers(task, onSelect))}
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
      {bind && (
        <rect
          x={cx - half - 2}
          y={cy - half - 2}
          width={MILESTONE_SIZE + 4}
          height={MILESTONE_SIZE + 4}
          fill="transparent"
          className="cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          {...bind.move}
        />
      )}
      <BarTail x={x + width + 6} row={row} assignees={assignees} label={task.name} />
      {link && <LinkHandle edge={x + width} row={row} handlers={link} />}
    </g>
  );
}
