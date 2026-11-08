import { HoursByCategoryChart } from "@/components/charts/hours-by-category-chart"
import { HoursByDayChart } from "@/components/charts/hours-by-day-chart"
import { TasksByCategoryChart } from "@/components/charts/tasks-by-category-chart"
import { PageHeader } from "@/components/page-header"
import { getT } from "@/lib/i18n/server"
import { categoryChartData, dayChartData } from "@/lib/metrics-format"
import { getMetrics } from "@/lib/queries/metrics"
import { getSettings } from "@/lib/queries/settings"
import { getActiveWorkspace } from "@/lib/queries/workspaces"

export const dynamic = "force-dynamic"

export default function MetricsPage() {
  const { t, intlLocale } = getT()
  const workspace = getActiveWorkspace()
  const metrics = getMetrics(workspace.id)
  const { weekStart } = getSettings()

  return (
    <>
      <PageHeader title={t("metrics.title")} description={t("metrics.description")} />
      {metrics.totalTasks === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {t("metrics.empty")}
        </p>
      ) : (
        // Remount per workspace so chart state never leaks across workspaces.
        <div key={workspace.id} className="grid gap-4 lg:grid-cols-2">
          <HoursByCategoryChart data={categoryChartData(metrics.byCategory, "hours")} />
          <TasksByCategoryChart data={categoryChartData(metrics.byCategory, "taskCount")} />
          <div className="lg:col-span-2">
            <HoursByDayChart data={dayChartData(metrics.hoursByDay, weekStart, intlLocale)} />
          </div>
        </div>
      )}
    </>
  )
}
