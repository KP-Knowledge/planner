"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { btnPrimary, btnSecondary, inputCls } from "@/components/buttons";
import { Modal } from "@/components/Modal";
import type { Project } from "@/server/projects";
import { useCreateProject, useUpdateProject } from "./api";

export function ProjectDialog({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const nameId = useId();
  const descId = useId();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const create = useCreateProject();
  const update = useUpdateProject();
  const mutation = project ? update : create;
  const trimmed = name.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || mutation.isPending) return;
    const desc = description.trim();
    try {
      if (project) {
        await update.mutateAsync({ id: project.id, name: trimmed, description: desc || null });
      } else {
        await create.mutateAsync({ name: trimmed, description: desc || null });
      }
      onClose();
    } catch {
      // error shown via mutation.isError
    }
  }

  return (
    <Modal title={project ? t("renameTitle") : t("newTitle")} onClose={onClose}>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={nameId} className="block text-sm font-medium">
            {t("name")}
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
            autoFocus
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={descId} className="block text-sm font-medium">
            {t("description")}
          </label>
          <textarea
            id={descId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={10000}
            className={inputCls}
          />
        </div>
        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {tc("error")}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            {tc("cancel")}
          </button>
          <button type="submit" disabled={!trimmed || mutation.isPending} className={btnPrimary}>
            {project ? tc("save") : tc("create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
