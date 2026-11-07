import type { Dependency } from "@/server/dependencies";
import { dependencyPath } from "./layout";

export type BarPosition = { x: number; width: number; row: number };

export const ARROW_ID = "gantt-arrow";

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

/** Finish-to-start arrows. Dependencies whose tasks are hidden (collapsed) are skipped. */
export function DependencyLayer({
  dependencies,
  positions,
}: {
  dependencies: readonly Dependency[];
  positions: ReadonlyMap<string, BarPosition>;
}) {
  return (
    <g fill="none" className="pointer-events-none stroke-muted" strokeWidth={1.5} strokeOpacity={0.8}>
      {dependencies.map((d) => {
        const from = positions.get(d.predecessorId);
        const to = positions.get(d.successorId);
        if (!from || !to) return null;
        return (
          <path
            key={d.id}
            d={dependencyPath(from, { x: to.x, row: to.row })}
            markerEnd={`url(#${ARROW_ID})`}
          />
        );
      })}
    </g>
  );
}
