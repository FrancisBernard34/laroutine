import { PageHeader } from "@/components/page-header"
import { ProfileForm } from "@/components/profile-form"
import { getT } from "@/lib/i18n/server"
import { getProfile } from "@/lib/queries/profile"

export const dynamic = "force-dynamic"

export default function Page() {
  const { t } = getT()
  return (
    <>
      <PageHeader title={t("account.title")} description={t("account.description")} />
      <ProfileForm profile={getProfile()} />
    </>
  )
}
