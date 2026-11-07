"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { btnPrimary } from "@/components/buttons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Project } from "@/server/projects";
import { useDeleteProject, useProjects, useUpdateProject } from "./api";
import { ProjectCard } from "./ProjectCard";
import { ProjectDialog } from "./ProjectDialog";

type Dialog =
  | { kind: "create" }
  | { kind: "rename"; project: Project }
  | { kind: "archive"; project: Project }
  | { kind: "delete"; project: Project };

export function ProjectList() {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const toggleId = useId();
  const [archived, setArchived] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { data, isPending, isError, refetch } = useProjects(archived);
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const close = () => setDialog(null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="flex-1 text-2xl font-semibold">{t("title")}</h1>
        <label htmlFor={toggleId} className="flex items-center gap-2 text-sm text-muted">
          <input
            id={toggleId}
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t("showArchived")}
        </label>
        <button type="button" onClick={() => setDialog({ kind: "create" })} className={btnPrimary}>
          {t("new")}
        </button>
      </div>

      {update.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {tc("error")}
        </p>
      )}

      <div className="mt-6">
        {isPending ? (
          <p className="text-sm text-muted">{tc("loading")}</p>
        ) : isError ? (
          <div role="alert" className="text-sm text-danger">
            {tc("error")}{" "}
            <button type="button" onClick={() => refetch()} className="underline">
              {tc("retry")}
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted">{archived ? t("emptyArchived") : t("empty")}</p>
            {!archived && (
              <button
                type="button"
                onClick={() => setDialog({ kind: "create" })}
                className={`${btnPrimary} mt-4`}
              >
                {t("new")}
              </button>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                archivedView={archived}
                onRename={() => setDialog({ kind: "rename", project })}
                onArchive={() => setDialog({ kind: "archive", project })}
                onRestore={() => update.mutate({ id: project.id, archived: false })}
                onDelete={() => setDialog({ kind: "delete", project })}
              />
            ))}
          </ul>
        )}
      </div>

      {dialog?.kind === "create" && <ProjectDialog onClose={close} />}
      {dialog?.kind === "rename" && <ProjectDialog project={dialog.project} onClose={close} />}
      {dialog?.kind === "archive" && (
        <ConfirmDialog
          title={t("archiveTitle")}
          body={t("archiveBody", { name: dialog.project.name })}
          confirmLabel={t("archive")}
          onConfirm={() => update.mutateAsync({ id: dialog.project.id, archived: true }).then(() => {})}
          onClose={close}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title={t("deleteTitle")}
          body={t("deleteBody", { name: dialog.project.name })}
          confirmLabel={t("deleteForever")}
          requireText={dialog.project.name}
          onConfirm={() => remove.mutateAsync(dialog.project.id)}
          onClose={close}
        />
      )}
    </div>
  );
}
