"use client"

import { useId, useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { CATEGORY_ICONS } from "@/lib/category-icons"
import { useT } from "@/lib/i18n/provider"
import { cn } from "@/lib/utils"

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Searchable grid of curated icons. `value` is the stored icon name. */
export function IconPicker({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: string
  onChange: (name: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  const gridId = useId()

  const entries = useMemo(() => {
    const q = normalize(query.trim())
    const all = Object.entries(CATEGORY_ICONS)
    if (!q) return all
    return all.filter(([name, e]) => normalize(`${name} ${e.keywords}`).includes(q))
  }, [query])

  return (
    <div className="grid gap-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("icons.searchPlaceholder")}
        aria-label={t("icons.search")}
        aria-controls={gridId}
      />
      <div
        id={gridId}
        role="radiogroup"
        aria-label={t("icons.gridLabel")}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto rounded-md border p-1.5 sm:grid-cols-8"
      >
        {entries.map(([name, { component: Icon }]) => {
          const selected = name === value
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                "grid size-10 place-items-center rounded-md outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                selected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          )
        })}
        {entries.length === 0 && (
          <p className="col-span-full p-2 text-center text-sm text-muted-foreground">
            {t("icons.none")}
          </p>
        )}
      </div>
    </div>
  )
}
