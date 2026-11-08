"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { ChartCard, ChartTooltip, SrTable } from "@/components/charts/chart-parts"
import { categoryColorVar, categoryTileStyle } from "@/lib/category-icons"
import { COLOR_RING, isStoredHex } from "@/lib/color"
import { useT } from "@/lib/i18n/provider"
import { formatHours, formatNumber, type ChartDatum } from "@/lib/metrics-format"

/** Donut of planned hours per category + a legend with exact values and shares. */
export function HoursByCategoryChart({ data }: { data: ChartDatum[] }) {
  const { t, intlLocale } = useT()
  const title = t("metrics.hoursByCategory")
  const total = data.reduce((s, d) => s + d.value, 0)
  const pct = new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 0 })

  return (
    <ChartCard title={title}>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-48 w-48 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell
                    key={d.key}
                    fill={categoryColorVar(d.color)}
                    stroke={isStoredHex(d.color) ? COLOR_RING : "var(--card)"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={(p) => (
                  <ChartTooltip
                    active={p.active}
                    payload={p.payload as never}
                    format={(v) => formatHours(v, intlLocale)}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid w-full min-w-0 gap-1.5 text-sm">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-sm"
                style={categoryTileStyle(d.color)}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="tabular-nums">{formatHours(d.value, intlLocale)}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {pct.format(total ? d.value / total : 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <SrTable
        caption={title}
        head={[t("metrics.category"), t("metrics.hours")]}
        rows={data.map((d) => [d.name, formatNumber(d.value, intlLocale)])}
      />
    </ChartCard>
  )
}
