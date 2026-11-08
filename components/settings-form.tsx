"use client"

import { useId, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSettings, updateWorkspaceGrid } from "@/lib/actions/settings"
import { useT } from "@/lib/i18n/provider"
import { formatMinutes } from "@/lib/time"
import type { Locale, Settings, WeekStart, Workspace } from "@/lib/types"
import { gridSchema, settingsSchema } from "@/lib/validation"

const HOURS = Array.from({ length: 25 }, (_, h) => h)

function FieldError({ id, message }: { id: string; message?: string }) {
  const { t } = useT()
  return message ? (
    <p id={id} role="alert" className="text-sm text-destructive">
      {t(message)}
    </p>
  ) : null
}

export function SettingsForm({
  settings,
  workspace,
  timeZones,
}: {
  settings: Settings
  workspace: Workspace
  timeZones: string[]
}) {
  return (
    <div className="grid max-w-xl gap-6">
      <GeneralSection settings={settings} timeZones={timeZones} />
      <GridSection workspace={workspace} />
    </div>
  )
}

// Radix Select items cannot have an empty value, so "Automatic" (stored as NULL) uses a sentinel.
const TZ_AUTO = "__auto__"

function GeneralSection({ settings, timeZones }: { settings: Settings; timeZones: string[] }) {
  const { t } = useT()
  const uid = useId()
  const [pending, startTransition] = useTransition()
  const [language, setLanguage] = useState<Locale>(settings.language)
  const [weekStart, setWeekStart] = useState<WeekStart>(settings.weekStart)
  const [timezone, setTimezone] = useState<string>(settings.timezone ?? TZ_AUTO)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  // A saved zone missing from this runtime's list must still show as the selected value.
  const zoneOptions =
    settings.timezone && !timeZones.includes(settings.timezone)
      ? [settings.timezone, ...timeZones]
      : timeZones

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    const parsed = settingsSchema.safeParse({
      language,
      weekStart,
      timezone: timezone === TZ_AUTO ? null : timezone,
    })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      return
    }
    setErrors({})
    setFormError(null)
    startTransition(async () => {
      const res = await updateSettings(parsed.data)
      if (res.ok) setSaved(true)
      else {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error ?? null)
      }
    })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold">{t("settings.generalTitle")}</h2>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-language`}>{t("settings.language")}</Label>
        <Select value={language} onValueChange={(v) => setLanguage(v as Locale)}>
          <SelectTrigger id={`${uid}-language`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">{t("settings.languagePt")}</SelectItem>
            <SelectItem value="en">{t("settings.languageEn")}</SelectItem>
          </SelectContent>
        </Select>
        <FieldError id={`${uid}-language-error`} message={errors.language} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-week`}>{t("settings.weekStart")}</Label>
        <Select value={weekStart} onValueChange={(v) => setWeekStart(v as WeekStart)}>
          <SelectTrigger id={`${uid}-week`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunday">{t("settings.weekSunday")}</SelectItem>
            <SelectItem value="monday">{t("settings.weekMonday")}</SelectItem>
          </SelectContent>
        </Select>
        <FieldError id={`${uid}-week-error`} message={errors.weekStart} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-tz`}>{t("settings.timezone")}</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id={`${uid}-tz`} className="w-full" aria-describedby={`${uid}-tz-hint`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TZ_AUTO}>{t("settings.timezoneAuto")}</SelectItem>
            {zoneOptions.map((z) => (
              <SelectItem key={z} value={z}>
                {z.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id={`${uid}-tz-hint`} className="text-sm text-muted-foreground">
          {t("settings.timezoneHint")}
        </p>
        <FieldError id={`${uid}-tz-error`} message={errors.timezone} />
      </div>

      {formError && <FieldError id={`${uid}-form-error`} message={formError} />}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("settings.save")}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("settings.saved")}
          </p>
        )}
      </div>
    </form>
  )
}

function GridSection({ workspace }: { workspace: Workspace }) {
  const { t, intlLocale } = useT()
  const uid = useId()
  const [pending, startTransition] = useTransition()
  const [startHour, setStartHour] = useState(workspace.gridStartHour)
  const [endHour, setEndHour] = useState(workspace.gridEndHour)
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(workspace.slotMinutes)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    const parsed = gridSchema.safeParse({ startHour, endHour, slotMinutes })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      return
    }
    setErrors({})
    setFormError(null)
    startTransition(async () => {
      const res = await updateWorkspaceGrid(parsed.data)
      if (res.ok) setSaved(true)
      else {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error ?? null)
      }
    })
  }

  const clear = () => {
    setErrors({})
    setSaved(false)
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.gridTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.gridDescription", { name: workspace.name })}
        </p>
      </div>

      <div className="grid grid-cols-2 items-start gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-start`}>{t("settings.gridStart")}</Label>
          <Select
            value={String(startHour)}
            onValueChange={(v) => {
              setStartHour(Number(v))
              clear()
            }}
          >
            <SelectTrigger id={`${uid}-start`} className="w-full" aria-invalid={errors.startHour ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.slice(0, 24).map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {formatMinutes(h * 60, intlLocale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${uid}-start-error`} message={errors.startHour} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-end`}>{t("settings.gridEnd")}</Label>
          <Select
            value={String(endHour)}
            onValueChange={(v) => {
              setEndHour(Number(v))
              clear()
            }}
          >
            <SelectTrigger id={`${uid}-end`} className="w-full" aria-invalid={errors.endHour ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.slice(1).map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {formatMinutes(h * 60, intlLocale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${uid}-end-error`} message={errors.endHour} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${uid}-slot`}>{t("settings.slot")}</Label>
        <Select
          value={String(slotMinutes)}
          onValueChange={(v) => {
            setSlotMinutes(Number(v) as 15 | 30 | 60)
            clear()
          }}
        >
          <SelectTrigger id={`${uid}-slot`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">{t("settings.slot15")}</SelectItem>
            <SelectItem value="30">{t("settings.slot30")}</SelectItem>
            <SelectItem value="60">{t("settings.slot60")}</SelectItem>
          </SelectContent>
        </Select>
        <FieldError id={`${uid}-slot-error`} message={errors.slotMinutes} />
      </div>

      <p className="text-sm text-muted-foreground">{t("settings.gridHint")}</p>

      {formError && <FieldError id={`${uid}-form-error`} message={formError} />}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("settings.save")}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("settings.saved")}
          </p>
        )}
      </div>
    </form>
  )
}
