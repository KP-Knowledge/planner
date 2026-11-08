"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { btnDanger, btnSecondary, inputCls } from "./buttons";
import { Modal } from "./Modal";

export type ConfirmDialogProps = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  requireText?: string;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  requireText,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const blocked = requireText !== undefined && typed !== requireText;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (blocked || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
      onClose();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="mt-3 space-y-4">
        <div className="text-sm text-muted">{body}</div>
        {requireText !== undefined && (
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="block text-sm">
              {t("typeToConfirm", { text: requireText })}
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={inputCls}
            />
          </div>
        )}
        {failed && (
          <p role="alert" className="text-sm text-danger">
            {t("error")}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={blocked || busy} className={btnDanger}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
