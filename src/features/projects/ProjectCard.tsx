"use client";

import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { btnGhost } from "@/components/buttons";
import type { Project } from "@/server/projects";

export function ProjectCard({
  project,
  archivedView,
  onRename,
  onArchive,
  onRestore,
  onDelete,
}: {
  project: Project;
  archivedView: boolean;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("projects");
  const format = useFormatter();
  const updated = format.dateTime(new Date(project.updatedAt), { dateStyle: "medium" });

  return (
    <li className="flex flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex-1 p-4">
        <h2 className="text-base font-semibold">
          <Link
            href={`/projects/${project.id}`}
            className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {project.name}
          </Link>
        </h2>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{project.description}</p>
        )}
        <p className="mt-3 text-xs text-muted">{t("updated", { date: updated })}</p>
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border px-2 py-2">
        <button type="button" onClick={onRename} className={btnGhost}>
          {t("rename")}
        </button>
        {archivedView ? (
          <>
            <button type="button" onClick={onRestore} className={btnGhost}>
              {t("restore")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`${btnGhost} ml-auto text-danger hover:text-danger`}
            >
              {t("deleteForever")}
            </button>
          </>
        ) : (
          <button type="button" onClick={onArchive} className={btnGhost}>
            {t("archive")}
          </button>
        )}
      </div>
    </li>
  );
}
