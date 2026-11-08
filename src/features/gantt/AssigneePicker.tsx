"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { inputCls } from "@/components/buttons";
import { displayName, type AvatarUser } from "./avatar";
import { HtmlAvatars } from "./Avatars";

export function AssigneePicker({
  users,
  value,
  onChange,
}: {
  users: readonly AvatarUser[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("gantt");
  const labelId = useId();
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q));
  }, [users, query]);

  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span id={labelId} className="text-xs font-medium text-muted">
          {t("fieldAssignees")}
        </span>
        <HtmlAvatars users={users.filter((u) => selected.has(u.id))} />
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // The picker lives inside the task form: Enter must not submit it.
          if (e.key === "Enter") e.preventDefault();
        }}
        aria-label={t("filterUsers")}
        placeholder={t("filterUsers")}
        className={inputCls}
      />
      {visible.length === 0 ? (
        <p className="text-sm text-muted">{t("noUsers")}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
          {visible.map((u) => (
            <li key={u.id}>
              <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="accent-primary"
                />
                <HtmlAvatars users={[u]} />
                <span className="min-w-0 flex-1 truncate">
                  {displayName(u) || t("unknownUser")}
                  {u.name && u.email && <span className="ml-2 text-xs text-muted">{u.email}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
