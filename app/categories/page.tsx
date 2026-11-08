import { CategoriesManager } from "@/components/categories-manager"
import { PageHeader } from "@/components/page-header"
import { listCategories } from "@/lib/queries/categories"
import { getActiveWorkspace } from "@/lib/queries/workspaces"
import { getT } from "@/lib/i18n/server"

export default function Page() {
  const { t } = getT()
  const workspace = getActiveWorkspace()
  const categories = listCategories(workspace.id)
  return (
    <>
      <PageHeader
        title={t("categories.title")}
        description={`${workspace.name}: ${t("categories.description")}`}
      />
      <CategoriesManager categories={categories} />
    </>
  )
}
