"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  onDismiss,
  size = "md",
  children,
}: {
  title: string;
  onClose: () => void;
  /** Called for Esc and backdrop click instead of closing right away, so the caller can ask first. */
  onDismiss?: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  // A backdrop click only counts when the press also started on the backdrop, so a text-selection drag that ends outside doesn't dismiss.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (!onDismiss || e.key !== "Escape") return;
    // Handle Esc ourselves: the native cancel event can be non-cancelable (Chrome close watcher, repeated Esc).
    e.preventDefault();
    onDismiss();
  };

  const onNativeClose = () => {
    const dialog = ref.current;
    if (!onDismiss || !dialog) return onClose();
    // Closed behind the caller's back (cancel was not cancelable). Reopen so unsaved state is never dropped silently.
    if (!dialog.open) dialog.showModal();
    onDismiss();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onNativeClose}
      onCancel={
        onDismiss
          ? (e) => {
              e.preventDefault();
              onDismiss();
            }
          : undefined
      }
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const pressed = pressedBackdrop.current;
        pressedBackdrop.current = false;
        if (pressed && e.target === e.currentTarget) (onDismiss ?? onClose)();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${size === "lg" ? "max-w-[560px]" : "max-w-md"} rounded-lg border border-border bg-card p-0 text-text shadow-xl backdrop:bg-black/40`}
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
