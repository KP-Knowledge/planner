const PALETTE = [
  "#4F46E5",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#10B981",
  "#06B6D4",
  "#6B7280",
];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Thai leading vowels are written before the consonant they follow.
const LEADING_VOWELS = /^[เแโใไ]+/;

function firstChar(word: string): string {
  const stripped = word.replace(LEADING_VOWELS, "");
  return (Array.from(stripped)[0] ?? Array.from(word)[0] ?? "").toUpperCase();
}

export function initials(user: { name: string | null; email: string | null }): string {
  const words = (user.name ?? "").split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map(firstChar).join("");
  const local = (user.email ?? "").split("@")[0];
  return local ? firstChar(local) : "?";
}

export function displayName(user: { name: string | null; email: string | null }): string {
  return user.name ?? user.email ?? "?";
}
