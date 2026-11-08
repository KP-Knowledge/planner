import type { KeyboardEvent } from "react";
import type { Dependency } from "@/server/dependencies";
import { dependencyPath } from "./layout";

export type BarPosition = { x: number; width: number; row: number };

export const ARROW_ID = "gantt-arrow";

/** Width of the invisible stroke that makes a thin arrow easy to click. */
export const HIT_STROKE = 10;

export function DependencyDefs() {
  return (
    <marker
      id={ARROW_ID}
      markerWidth={8}
      markerHeight={8}
      refX={8}
      refY={4}
      orient="auto"
      markerUnits="userSpaceOnUse"
    >
      <path d="M0 0 L8 4 L0 8 z" className="fill-muted" />
    </marker>
  );
}

/**
 * Finish-to-start arrows. Dependencies whose tasks are hidden (collapsed) are
 * skipped. With `onRequestDelete`, each arrow is a focusable button: click,
 * Enter or Delete asks to remove it.
 */
export function DependencyLayer({
  dependencies,
  positions,
  label,
  onRequestDelete,
}: {
  dependencies: readonly Dependency[];
  positions: ReadonlyMap<string, BarPosition>;
  label?: (d: Dependency) => string;
  onRequestDelete?: (d: Dependency) => void;
}) {
  const keyDown = (d: Dependency) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRequestDelete?.(d);
    }
  };

  return (
    <g fill="none" className="pointer-events-none stroke-muted" strokeWidth={1.5} strokeOpacity={0.8}>
      {dependencies.map((d) => {
        const from = positions.get(d.predecessorId);
        const to = positions.get(d.successorId);
        if (!from || !to) return null;
        const path = dependencyPath(from, { x: to.x, row: to.row });
        if (!onRequestDelete) {
          return <path key={d.id} d={path} markerEnd={`url(#${ARROW_ID})`} />;
        }
        const text = label?.(d);
        return (
          <g
            key={d.id}
            tabIndex={0}
            role="button"
            aria-label={text}
            className="group outline-none"
            onClick={() => onRequestDelete(d)}
            onKeyDown={keyDown(d)}
          >
            {text && <title>{text}</title>}
            <path
              d={path}
              markerEnd={`url(#${ARROW_ID})`}
              className="group-hover:stroke-primary group-focus-visible:stroke-primary"
            />
            <path
              d={path}
              stroke="transparent"
              strokeWidth={HIT_STROKE}
              strokeOpacity={1}
              className="cursor-pointer"
              style={{ pointerEvents: "stroke" }}
            />
          </g>
        );
      })}
    </g>
  );
}
