"use client";

import { useRef, type KeyboardEvent } from "react";

export const TEAM_COLORS = [
  "#4F46E5",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#6B7280",
] as const;

export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = TEAM_COLORS.findIndex((c) => c.toLowerCase() === value.toLowerCase());

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + TEAM_COLORS.length) % TEAM_COLORS.length;
    onChange(TEAM_COLORS[next]);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {TEAM_COLORS.map((color, i) => {
        const checked = i === selected;
        return (
          <button
            key={color}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={color}
            tabIndex={checked || (selected === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(color)}
            onKeyDown={(e) => onKeyDown(e, i)}
            style={{ backgroundColor: color }}
            className={`h-6 w-6 rounded-full border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              checked ? "ring-2 ring-text ring-offset-2 ring-offset-card" : ""
            }`}
          />
        );
      })}
    </div>
  );
}
