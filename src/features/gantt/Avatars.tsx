import { useTranslations } from "next-intl";
import { avatarColor, displayName, initials, type AvatarUser } from "./avatar";
import { AVATAR_SIZE, AVATAR_STEP, splitAvatars } from "./layout";

export const AVATAR_CLIP_ID = "gantt-avatar-clip";

function HtmlAvatar({ user, size, title }: { user: AvatarUser; size: number; title: string }) {
  return (
    <span
      title={title}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card text-[9px] font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: avatarColor(user.id) }}
    >
      {initials(user)}
      {user.image && (
        <span
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(user.image)})` }}
        />
      )}
    </span>
  );
}

export function HtmlAvatars({ users, size = 22 }: { users: readonly AvatarUser[]; size?: number }) {
  const t = useTranslations("gantt");
  const { shown, extra } = splitAvatars(users);
  if (users.length === 0) return null;
  const name = (u: AvatarUser) => displayName(u) || t("unknownUser");
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <HtmlAvatar key={u.id} user={u} size={size} title={name(u)} />
      ))}
      {extra > 0 && (
        <span
          title={users.slice(shown.length).map(name).join(", ")}
          className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-card bg-surface text-[9px] font-semibold text-muted"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/** SVG avatars for the timeline. Needs the shared clip path from TimelinePane's <defs>. */
export function SvgAvatars({ users, x, y }: { users: readonly AvatarUser[]; x: number; y: number }) {
  const t = useTranslations("gantt");
  const { shown, extra } = splitAvatars(users);
  const name = (u: AvatarUser) => displayName(u) || t("unknownUser");
  const r = AVATAR_SIZE / 2;
  const slot = (i: number) => x + i * AVATAR_STEP;
  return (
    <g>
      {shown.map((u, i) => (
        <g key={u.id}>
          <title>{name(u)}</title>
          <circle cx={slot(i) + r} cy={y + r} r={r} fill={avatarColor(u.id)} className="stroke-card" strokeWidth={1.5} />
          <text
            x={slot(i) + r}
            y={y + r}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={7.5}
            fontWeight={600}
            fill="#fff"
          >
            {initials(u)}
          </text>
          {u.image && (
            <image
              href={u.image}
              x={slot(i)}
              y={y}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${AVATAR_CLIP_ID})`}
            />
          )}
        </g>
      ))}
      {extra > 0 && (
        <g>
          <title>{users.slice(shown.length).map(name).join(", ")}</title>
          <circle
            cx={slot(shown.length) + r}
            cy={y + r}
            r={r}
            className="fill-surface stroke-border"
            strokeWidth={1}
          />
          <text
            x={slot(shown.length) + r}
            y={y + r}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8}
            fontWeight={600}
            className="fill-muted"
          >
            +{extra}
          </text>
        </g>
      )}
    </g>
  );
}
