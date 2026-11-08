"use client";

import { useEffect, useRef, useState } from "react";

export type CloseReason = "key" | "blur";

const INPUT =
  "h-7 w-full min-w-0 rounded border border-primary bg-card px-2 text-sm text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Single-line editor for grid cells. Enter and blur save (blank or unchanged
 * text saves nothing), Esc cancels. With `keepOpen`, Enter clears the field
 * for the next entry instead of closing.
 */
export function InlineInput({
  initial = "",
  label,
  placeholder,
  keepOpen = false,
  onSubmit,
  onClose,
}: {
  initial?: string;
  label: string;
  placeholder?: string;
  keepOpen?: boolean;
  onSubmit: (value: string) => void;
  onClose: (reason: CloseReason) => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const save = () => {
    const v = value.trim();
    if (v && v !== initial) onSubmit(v);
    return v;
  };

  return (
    <input
      ref={ref}
      value={value}
      maxLength={200}
      aria-label={label}
      placeholder={placeholder}
      autoComplete="off"
      className={INPUT}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        // Enter that confirms an IME composition (Thai, CJK) is not a save.
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter") {
          e.preventDefault();
          const v = save();
          if (keepOpen && v) {
            setValue("");
            return;
          }
          settled.current = true;
          onClose("key");
        } else if (e.key === "Escape") {
          e.preventDefault();
          settled.current = true;
          onClose("key");
        }
      }}
      onBlur={() => {
        if (settled.current) return;
        settled.current = true;
        save();
        onClose("blur");
      }}
    />
  );
}
