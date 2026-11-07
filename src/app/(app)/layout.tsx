import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-6 border-b border-border bg-card px-4">
        <span className="text-lg font-semibold text-primary">{t("app.name")}</span>
        <nav className="flex flex-1 items-center gap-4 text-sm">
          <span className="text-text">{t("nav.projects")}</span>
        </nav>
        <ThemeToggle />
        <LocaleSwitch />
        <UserMenu />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
