import { ScheduleGrid } from "@/components/schedule-grid"
import { listCategories } from "@/lib/queries/categories"
import { getSettings } from "@/lib/queries/settings"
import { listTasks } from "@/lib/queries/tasks"
import { getActiveWorkspace } from "@/lib/queries/workspaces"
import { getT } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

export default function SchedulePage() {
  const { t } = getT()
  const workspace = getActiveWorkspace()
  const settings = getSettings()
  return (
    <>
      <ScheduleGrid
        title={t("grid.title")}
        description={t("grid.description")}
        // Remount per workspace so dialog/tab state never leaks across workspaces.
        key={workspace.id}
        tasks={listTasks(workspace.id)}
        categories={listCategories(workspace.id)}
        workspace={workspace}
        weekStart={settings.weekStart}
        timezone={settings.timezone}
      />
    </>
  )
}
