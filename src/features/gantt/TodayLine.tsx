export function TodayLine({ x, height }: { x: number; height: number }) {
  return (
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={height}
      stroke="var(--color-danger)"
      strokeWidth={2}
      className="pointer-events-none"
      aria-hidden
    />
  );
}
