"use client"

import type { ReactNode } from "react"

import type { ChartDatum } from "@/lib/metrics-format"

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const
export const CURSOR = { fill: "var(--muted)", opacity: 0.6 } as const

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Screen-reader table twin of a chart (values are never color-only). */
export function SrTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: [string, string]
  rows: [string, string][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i}>
            <th scope="row">{a}</th>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface TipProps {
  active?: boolean
  payload?: { payload?: ChartDatum }[]
  format: (v: number) => string
}

/** Tooltip on popover tokens: readable in both themes. */
export function ChartTooltip({ active, payload, format }: TipProps) {
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium">{d.name}</div>
      <div className="tabular-nums text-muted-foreground">{format(d.value)}</div>
    </div>
  )
}
