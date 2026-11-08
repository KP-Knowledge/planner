"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", key: "projects" },
  { href: "/teams", key: "teams" },
] as const;

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex flex-1 items-center gap-1 text-sm">
      {links.map(({ href, key }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="rounded-md px-3 py-1.5 text-muted hover:text-text aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-text"
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
