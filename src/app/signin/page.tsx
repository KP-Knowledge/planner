import { getTranslations } from "next-intl/server";
import { signIn } from "@/auth";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function SignInPage() {
  const t = await getTranslations();

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute right-4 top-4 flex items-center gap-3">
        <ThemeToggle />
        <LocaleSwitch />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold text-primary">{t("app.name")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.subtitle")}</p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("keycloak", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("auth.signInWithKeycloak")}
          </button>
        </form>
      </div>
    </main>
  );
}
