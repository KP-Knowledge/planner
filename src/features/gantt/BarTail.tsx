import type { User } from "@/server/users";
import { SvgAvatars } from "./Avatars";
import { AVATAR_SIZE, ROW_HEIGHT, avatarStackWidth } from "./layout";

/** Avatars and (optionally) an outside label, placed right after a bar or milestone. */
export function BarTail({
  x,
  row,
  assignees,
  label,
}: {
  x: number;
  row: number;
  assignees: readonly User[];
  label?: string;
}) {
  const mid = row * ROW_HEIGHT + ROW_HEIGHT / 2;
  const stack = avatarStackWidth(assignees.length);
  const labelX = x + (stack > 0 ? stack + 6 : 0);
  return (
    <>
      {stack > 0 && <SvgAvatars users={assignees} x={x} y={mid - AVATAR_SIZE / 2} />}
      {label && (
        <text x={labelX} y={mid} dominantBaseline="central" fontSize={12} className="fill-text">
          {label}
        </text>
      )}
    </>
  );
}
