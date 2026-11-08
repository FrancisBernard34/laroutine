"use client"

import { useId, useState, useTransition } from "react"

import { ProfileAvatar } from "@/components/profile-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile } from "@/lib/actions/profile"
import { useT } from "@/lib/i18n/provider"
import type { Profile } from "@/lib/types"
import { profileSchema } from "@/lib/validation"

export function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useT()
  const uid = useId()
  const [pending, startTransition] = useTransition()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    const parsed = profileSchema.safeParse({ displayName, avatarUrl })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      return
    }
    setErrors({})
    setFormError(null)
    startTransition(async () => {
      const res = await updateProfile(parsed.data)
      if (res.ok) {
        setSaved(true)
        setDisplayName(res.data?.displayName ?? parsed.data.displayName)
        setAvatarUrl(res.data?.avatarUrl ?? "")
      } else {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error ?? null)
      }
    })
  }

  const previewUrl = /^https?:\/\/\S+$/i.test(avatarUrl.trim()) ? avatarUrl.trim() : null

  return (
    <form onSubmit={submit} noValidate className="grid min-w-0 max-w-xl grid-cols-1 gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <ProfileAvatar name={displayName} avatarUrl={previewUrl} size="lg" className="size-14" />
        <h2 className="min-w-0 truncate text-lg font-semibold">
          {displayName.trim() || t("account.defaultName")}
        </h2>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-name`}>{t("account.displayName")}</Label>
        <Input
          id={`${uid}-name`}
          value={displayName}
          placeholder={t("account.displayNamePlaceholder")}
          autoComplete="off"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={errors.displayName ? `${uid}-name-error` : undefined}
          onChange={(e) => {
            setDisplayName(e.target.value)
            setSaved(false)
          }}
        />
        {errors.displayName && (
          <p id={`${uid}-name-error`} role="alert" className="text-sm text-destructive">
            {t(errors.displayName)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-avatar`}>{t("account.avatarUrl")}</Label>
        <Input
          id={`${uid}-avatar`}
          type="url"
          inputMode="url"
          value={avatarUrl}
          placeholder={t("account.avatarPlaceholder")}
          autoComplete="off"
          aria-invalid={errors.avatarUrl ? true : undefined}
          aria-describedby={`${uid}-avatar-hint${errors.avatarUrl ? ` ${uid}-avatar-error` : ""}`}
          onChange={(e) => {
            setAvatarUrl(e.target.value)
            setSaved(false)
          }}
        />
        <p id={`${uid}-avatar-hint`} className="text-sm text-muted-foreground">
          {t("account.avatarHint")}
        </p>
        {errors.avatarUrl && (
          <p id={`${uid}-avatar-error`} role="alert" className="text-sm text-destructive">
            {t(errors.avatarUrl)}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {t(formError)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("account.save")}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("account.saved")}
          </p>
        )}
      </div>
    </form>
  )
}
