"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { AXIS_TICK, ChartCard, ChartTooltip, CURSOR, SrTable } from "@/components/charts/chart-parts"
import { useT } from "@/lib/i18n/provider"
import { formatHours, formatNumber, type ChartDatum } from "@/lib/metrics-format"

/** Columns of planned hours per weekday, in week-start order (data arrives ordered). */
export function HoursByDayChart({ data }: { data: ChartDatum[] }) {
  const { t, intlLocale } = useT()
  const title = t("metrics.hoursByDay")

  return (
    <ChartCard title={title}>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid-line-strong)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} />
            <YAxis
              width={36}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => formatNumber(v, intlLocale)}
            />
            <Tooltip
              cursor={CURSOR}
              content={(p) => (
                <ChartTooltip
                  active={p.active}
                  payload={p.payload as never}
                  format={(v) => formatHours(v, intlLocale)}
                />
              )}
            />
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="value"
                position="top"
                fill="var(--foreground)"
                fontSize={11}
                formatter={(v: unknown) => (Number(v) > 0 ? formatNumber(Number(v), intlLocale) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={title}
        head={[t("metrics.day"), t("metrics.hours")]}
        rows={data.map((d) => [d.name, formatHours(d.value, intlLocale)])}
      />
    </ChartCard>
  )
}
