import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";

export async function UserMenu() {
  const [session, t] = await Promise.all([auth(), getTranslations("auth")]);
  const user = session?.user;
  if (!user) return null;
  const label = user.name ?? user.email ?? "";

  return (
    <div className="flex items-center gap-3 text-sm">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-white"
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-40 truncate text-text">{label}</span>
      {/* Plain anchor: the route redirects off-site to Keycloak. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/auth/federated-logout" className="text-muted hover:text-text">
        {t("signOut")}
      </a>
    </div>
  );
}
