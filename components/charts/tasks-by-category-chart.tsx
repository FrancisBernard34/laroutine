"use client"

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { AXIS_TICK, ChartCard, ChartTooltip, CURSOR, SrTable } from "@/components/charts/chart-parts"
import { categoryColorVar } from "@/lib/category-icons"
import { COLOR_RING, isStoredHex } from "@/lib/color"
import { useT } from "@/lib/i18n/provider"
import { formatNumber, type ChartDatum } from "@/lib/metrics-format"

/** Horizontal bars (long category names stay legible at 390px) with value labels. */
export function TasksByCategoryChart({ data }: { data: ChartDatum[] }) {
  const { t, intlLocale } = useT()
  const title = t("metrics.tasksByCategory")
  const count = (n: number) => t(n === 1 ? "metrics.taskOne" : "metrics.taskMany", { n: String(n) })

  return (
    <ChartCard title={title}>
      <div aria-hidden="true" style={{ height: Math.max(160, data.length * 40 + 16) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={96}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            />
            <Tooltip
              cursor={CURSOR}
              content={(p) => (
                <ChartTooltip active={p.active} payload={p.payload as never} format={count} />
              )}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={categoryColorVar(d.color)}
                  stroke={isStoredHex(d.color) ? COLOR_RING : undefined}
                  strokeWidth={1}
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                fill="var(--foreground)"
                fontSize={12}
                formatter={(v: unknown) => formatNumber(Number(v), intlLocale)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={title}
        head={[t("metrics.category"), t("metrics.tasks")]}
        rows={data.map((d) => [d.name, formatNumber(d.value, intlLocale)])}
      />
    </ChartCard>
  )
}
