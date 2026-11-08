"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { btnGhostDanger, btnPrimary, inputCls } from "@/components/buttons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Team } from "@/server/teams";
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from "./api";
import { ColorPicker, TEAM_COLORS } from "./ColorPicker";

function TeamRow({ team, onDelete }: { team: Team; onDelete: () => void }) {
  const t = useTranslations("teams");
  const update = useUpdateTeam();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const cancelled = useRef(false);
  const refocus = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false;
      trigger.current?.focus();
    }
  }, [editing]);

  function start() {
    setDraft(team.name);
    cancelled.current = false;
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (cancelled.current || !next || next === team.name) return;
    update.mutate({ id: team.id, name: next });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span
        aria-hidden
        className="h-4 w-4 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: team.color }}
      />
      <div className="min-w-40 flex-1">
        {editing ? (
          <input
            aria-label={t("name")}
            value={draft}
            autoFocus
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                refocus.current = true;
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                cancelled.current = true;
                refocus.current = true;
                setEditing(false);
              }
            }}
            className={inputCls}
          />
        ) : (
          <button
            ref={trigger}
            type="button"
            onClick={start}
            title={t("rename")}
            className="rounded-sm text-left text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {team.name}
          </button>
        )}
        {update.isError && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {t("saveError")}
          </p>
        )}
      </div>
      <ColorPicker
        label={t("color")}
        value={team.color}
        onChange={(color) => update.mutate({ id: team.id, color })}
      />
      <button type="button" onClick={onDelete} className={btnGhostDanger}>
        {t("delete")}
      </button>
    </li>
  );
}

export function TeamsPage() {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const nameId = useId();
  const { data, isPending, isError, refetch } = useTeams();
  const create = useCreateTeam();
  const remove = useDeleteTeam();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(TEAM_COLORS[0]);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const trimmed = name.trim();

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || create.isPending) return;
    try {
      await create.mutateAsync({ name: trimmed, color });
      setName("");
    } catch {
      // error shown via create.isError
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <form
        onSubmit={add}
        className="mt-6 space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <label htmlFor={nameId} className="block text-sm font-medium">
              {t("newName")}
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={!trimmed || create.isPending} className={btnPrimary}>
            {t("add")}
          </button>
        </div>
        <ColorPicker label={t("color")} value={color} onChange={setColor} />
        {create.isError && (
          <p role="alert" className="text-sm text-danger">
            {tc("error")}
          </p>
        )}
      </form>

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
            <p className="text-sm text-muted">{t("empty")}</p>
            <button
              type="button"
              onClick={() => document.getElementById(nameId)?.focus()}
              className={`${btnPrimary} mt-4`}
            >
              {t("add")}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card shadow-sm">
            {data.map((team) => (
              <TeamRow key={team.id} team={team} onDelete={() => setDeleting(team)} />
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={t("deleteTitle")}
          body={t("deleteBody", { name: deleting.name })}
          confirmLabel={t("delete")}
          onConfirm={() => remove.mutateAsync(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
