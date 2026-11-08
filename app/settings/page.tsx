import { PageHeader } from "@/components/page-header"
import { SettingsForm } from "@/components/settings-form"
import { getT } from "@/lib/i18n/server"
import { getSettings } from "@/lib/queries/settings"
import { getActiveWorkspace } from "@/lib/queries/workspaces"

export const dynamic = "force-dynamic"

function listTimeZones(): string[] {
  const zones = new Set<string>(Intl.supportedValuesOf("timeZone"))
  zones.add("UTC")
  return [...zones].sort((a, b) => a.localeCompare(b, "en"))
}

export default function Page() {
  const { t } = getT()
  const settings = getSettings()
  const workspace = getActiveWorkspace()
  // Built on the server and passed down so server and client render the same list.
  const timeZones = listTimeZones()
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <SettingsForm
        // Remount per workspace so the grid fields always start from that workspace.
        key={workspace.id}
        settings={settings}
        workspace={workspace}
        timeZones={timeZones}
      />
    </>
  )
}
