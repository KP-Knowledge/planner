import { getTranslations } from "next-intl/server";

export default async function ProjectsPage() {
  const t = await getTranslations("projects");

  return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
