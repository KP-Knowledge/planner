import { useRef, useState, type PointerEvent } from "react";
import type { BarPosition } from "./DependencyLayer";
import { LINK_HANDLE_OFFSET, ROW_HEIGHT } from "./layout";
import type { PointerHandlers } from "./useBarDrag";

/** Extra px around a bar's x range that still counts as dropping on it. */
export const DROP_SLOP = 4;

/**
 * Task whose row contains `y` and whose bar (widened by `slop`) contains `x`.
 * Points are in timeline SVG coordinates.
 */
export function taskAtPoint(
  positions: ReadonlyMap<string, BarPosition>,
  x: number,
  y: number,
  slop = DROP_SLOP,
): string | null {
  if (y < 0) return null;
  const row = Math.floor(y / ROW_HEIGHT);
  for (const [id, p] of positions) {
    if (p.row === row && x >= p.x - slop && x <= p.x + p.width + slop) return id;
  }
  return null;
}

export type LinkDrag = { fromId: string; x1: number; y1: number; x2: number; y2: number };

export function useDependencyDrag({
  positions,
  onCreate,
}: {
  positions: ReadonlyMap<string, BarPosition>;
  onCreate: (predecessorId: string, successorId: string) => void;
}) {
  const [drag, setDrag] = useState<LinkDrag | null>(null);
  const active = useRef<number | null>(null);

  const toPoint = (e: PointerEvent<SVGElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
  };

  const handlers = (taskId: string): PointerHandlers => ({
    onPointerDown(e) {
      if (e.button !== 0 || !e.isPrimary) return;
      const from = positions.get(taskId);
      if (!from) return;
      // Keeps the bar underneath from starting a move.
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      active.current = e.pointerId;
      const x = from.x + from.width + LINK_HANDLE_OFFSET;
      const y = from.row * ROW_HEIGHT + ROW_HEIGHT / 2;
      setDrag({ fromId: taskId, x1: x, y1: y, x2: x, y2: y });
    },
    onPointerMove(e) {
      if (active.current !== e.pointerId) return;
      const p = toPoint(e);
      if (p) setDrag((d) => d && { ...d, x2: p.x, y2: p.y });
    },
    onPointerUp(e) {
      if (active.current !== e.pointerId) return;
      active.current = null;
      const p = toPoint(e);
      setDrag(null);
      const target = p && taskAtPoint(positions, p.x, p.y);
      if (target && target !== taskId) onCreate(taskId, target);
    },
    onPointerCancel(e) {
      if (active.current !== e.pointerId) return;
      active.current = null;
      setDrag(null);
    },
  });

  return { drag, handlers };
}
