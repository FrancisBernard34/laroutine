"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useT } from "@/lib/i18n/provider"
import { formatMinutes } from "@/lib/time"

/** Select of slot times, labelled via Intl (not the OS-locale-driven native time input). */
export function TimeSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string
  value: number | null
  onChange: (minutes: number) => void
  options: number[]
  placeholder: string
  invalid?: boolean
  describedBy?: string
}) {
  const { intlLocale } = useT()
  // Keep an off-slot current value selectable (e.g. after the slot interval changed).
  const list =
    value !== null && !options.includes(value)
      ? [...options, value].sort((a, b) => a - b)
      : options
  return (
    <Select value={value === null ? "" : String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {list.map((m) => (
          <SelectItem key={m} value={String(m)}>
            {formatMinutes(m, intlLocale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
