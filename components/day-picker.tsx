"use client"

import { useT } from "@/lib/i18n/provider"
import { orderedDays, weekdayLabel } from "@/lib/time"
import type { WeekStart } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Multi-select of weekdays, ordered by the week-start setting. Values: 0 = Sunday .. 6. */
export function DayPicker({
  value,
  onChange,
  weekStart,
  labelledBy,
  invalid,
  describedBy,
}: {
  value: number[]
  onChange: (days: number[]) => void
  weekStart: WeekStart
  labelledBy: string
  invalid?: boolean
  describedBy?: string
}) {
  const { intlLocale } = useT()
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort())
  }
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="grid grid-cols-7 gap-1"
    >
      {orderedDays(weekStart).map((day) => {
        const on = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={weekdayLabel(day, intlLocale, "long")}
            onClick={() => toggle(day)}
            className={cn(
              "h-11 rounded-md border text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:h-9",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-transparent text-foreground hover:bg-accent",
              invalid && !on && "border-destructive",
            )}
          >
            {weekdayLabel(day, intlLocale, "short").replace(".", "")}
          </button>
        )
      })}
    </div>
  )
}
