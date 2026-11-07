"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-card p-0 text-text shadow-xl backdrop:bg-black/40"
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
