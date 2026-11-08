"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export type RowMenuItem = {
  key: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

const MENU_WIDTH = 168;

export function RowMenu({ name, items }: { name: string; items: readonly RowMenuItem[] }) {
  const t = useTranslations("gantt");
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setPos(null);
    };
    const close = () => setPos(null);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - MENU_WIDTH) });
  };

  const move = (dir: 1 | -1) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[(i + dir + els.length) % els.length]?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        aria-label={t("rowActions", { name })}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
      >
        <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden fill="currentColor">
          <circle cx={3} cy={7} r={1.2} />
          <circle cx={7} cy={7} r={1.2} />
          <circle cx={11} cy={7} r={1.2} />
        </svg>
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          aria-label={t("rowActions", { name })}
          className="fixed z-50 rounded-md border border-border bg-card py-1 shadow-lg"
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              e.preventDefault();
              setPos(null);
              button.current?.focus();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              move(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            } else if (e.key === "Tab") {
              setPos(null);
            }
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                // Focus the trigger first so dialogs opened by the action return focus to it.
                button.current?.focus();
                setPos(null);
                item.onSelect();
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-surface focus-visible:bg-surface focus-visible:outline-none ${
                item.danger ? "text-danger" : "text-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
