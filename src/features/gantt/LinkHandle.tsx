import { LINK_HANDLE_OFFSET, LINK_HANDLE_RADIUS, ROW_HEIGHT } from "./layout";
import type { PointerHandlers } from "./useBarDrag";

/** Circle just past a bar's right edge; dragging from it draws a dependency. */
export function LinkHandle({
  edge,
  row,
  handlers,
}: {
  /** Right edge of the bar (or the right tip of a milestone). */
  edge: number;
  row: number;
  handlers: PointerHandlers;
}) {
  return (
    <circle
      cx={edge + LINK_HANDLE_OFFSET}
      cy={row * ROW_HEIGHT + ROW_HEIGHT / 2}
      r={LINK_HANDLE_RADIUS}
      strokeWidth={2}
      className="cursor-crosshair fill-card stroke-primary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{ touchAction: "none" }}
      aria-hidden
      {...handlers}
    />
  );
}
