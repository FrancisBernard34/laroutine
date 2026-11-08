"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Plus } from "lucide-react"
import { Tabs } from "radix-ui"

import { TaskCard } from "@/components/task-card"
import { TaskDialog } from "@/components/task-dialog"
import { TaskTooltip } from "@/components/task-tooltip"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_MS } from "@/lib/constants"
import { positionDay } from "@/lib/layout-day"
import { useT } from "@/lib/i18n/provider"
import { formatMinutes, nowInZone, orderedDays, slotTimes, weekdayLabel } from "@/lib/time"
import type { Category, Task, WeekStart, Workspace } from "@/lib/types"
import { cn } from "@/lib/utils"

type DialogState = {
  open: boolean
  task: Task | null
  defaults?: { days?: number[]; startMinute?: number }
}

const COLS =
  "grid-cols-[var(--grid-gutter-w)_minmax(0,1fr)] md:grid-cols-[var(--grid-gutter-w)_repeat(7,minmax(var(--grid-day-min-w),1fr))]"

const noopSubscribe = () => () => {}

/** Row height in rem per slot interval; mirrors --grid-row-h-* in globals.css. */
const ROW_REM = { 15: 1.75, 30: 2.5, 60: 4 } as const
/** Cards rendered shorter than this (rem) use the compact one-line layout. */
const COMPACT_BELOW_REM = 2
/** Cards shorter than this (rem) switch to the compact layout when narrow. */
const SHORT_BELOW_REM = 2.5
/** Mirrors --task-card-min-h: drawn height floor = 15 min on the 60-min grid. */
const MIN_CARD_REM = 1

export function ScheduleGrid({
  tasks,
  categories,
  workspace,
  weekStart,
  timezone,
}: {
  tasks: Task[]
  categories: Category[]
  workspace: Workspace
  weekStart: WeekStart
  timezone: string | null
}) {
  const { t } = useT()
  const [dialog, setDialog] = useState<DialogState>({ open: false, task: null })
  const [picked, setPicked] = useState<number | null>(null)

  const { intlLocale } = useT()
  const order = orderedDays(weekStart)
  // Today on the client, first day of the week order on the server: no hydration mismatch.
  // Same configured zone as the noon auto-scroll below, so they never disagree.
  const today = useSyncExternalStore(
    noopSubscribe,
    () => nowInZone(timezone).day,
    () => order[0],
  )
  const activeDay = picked ?? today
  // Desktop "today" highlight: null on the server so the first paint never highlights a wrong column.
  const realToday = useSyncExternalStore(
    noopSubscribe,
    () => nowInZone(timezone).day,
    () => null,
  )

  const slot = workspace.slotMinutes
  const startMin = workspace.gridStartHour * 60
  const endMin = workspace.gridEndHour * 60
  const rowStarts = useMemo(() => slotTimes(workspace).slice(0, -1), [workspace])
  const rows = rowStarts.length
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const byDay = useMemo(() => {
    const map = new Map<number, ReturnType<typeof positionDay<{ id: number; start: number; end: number; task: Task }>>>()
    for (let d = 0; d < 7; d++) {
      const items = tasks
        .filter((x) => x.days.includes(d))
        .map((x) => ({ id: x.id, start: x.startMinute, end: x.endMinute, task: x }))
      map.set(d, positionDay(items, { startMin, endMin, slotMinutes: slot }))
    }
    return map
  }, [tasks, startMin, endMin, slot])

  // Element that opened the dialog, so focus can return to it on close.
  const openerRef = useRef<HTMLElement | null>(null)
  const newButtonRef = useRef<HTMLButtonElement>(null)
  const rememberOpener = (fromButton: boolean) => {
    const el = document.activeElement
    openerRef.current =
      fromButton && el instanceof HTMLElement && el !== document.body ? el : null
  }

  const openCreate = (defaults?: DialogState["defaults"]) =>
    setDialog({ open: true, task: null, defaults })

  const restoreFocus = (e: Event) => {
    e.preventDefault()
    const opener = openerRef.current
    openerRef.current = null
    // Opener gone (deleted/moved task) or an empty cell: use the "Nova tarefa" button.
    if (opener && opener.isConnected) opener.focus()
    else newButtonRef.current?.focus()
  }

  // Opening the schedule after noon (in the configured zone) shows the 12:00 row at the top.
  // Client-only: the server clock/zone is not the user's. rAF runs after App Router / browser
  // scroll restoration have settled.
  const noonInGrid = workspace.gridStartHour < 12 && 12 < workspace.gridEndHour
  useEffect(() => {
    if (!noonInGrid || nowInZone(timezone).minutes < 720) return
    const id = requestAnimationFrame(() => {
      document
        .querySelector("[data-noon-anchor]")
        ?.scrollIntoView({ block: "start", behavior: "instant" })
    })
    return () => cancelAnimationFrame(id)
    // Mount only: later task edits or zone changes must not yank the scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rowH = `var(--grid-row-h-${slot})`
  const rowRem = ROW_REM[slot]
  const hourRows = 60 / slot
  const bodyHeight = `calc(${rows} * var(--grid-row-h))`
  const linesBg = {
    height: bodyHeight,
    backgroundImage:
      "linear-gradient(to bottom, var(--grid-line-strong) 1px, transparent 1px)," +
      "linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
    backgroundSize: `100% calc(var(--grid-row-h) * ${hourRows}), 100% var(--grid-row-h)`,
  }

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS} skipDelayDuration={0}>
      <div className="grid gap-4">
        <div>
          <Button
            ref={newButtonRef}
            onClick={() => {
              rememberOpener(true)
              openCreate()
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t("tasks.new")}
          </Button>
        </div>

        <Tabs.Root
          value={String(activeDay)}
          onValueChange={(v) => setPicked(Number(v))}
          className="md:hidden"
        >
          <Tabs.List
            aria-label={t("grid.days")}
            className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
          >
            {order.map((d) => (
              <Tabs.Trigger
                key={d}
                value={String(d)}
                className="min-h-11 min-w-11 flex-1 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {weekdayLabel(d, intlLocale)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>

        <div
          role="group"
          aria-label={t("grid.label")}
          className="overflow-x-auto rounded-lg border bg-card"
          style={{ ["--grid-row-h" as string]: rowH }}
        >
          <div className="md:min-w-[calc(var(--grid-gutter-w)+7*var(--grid-day-min-w))]">
            {/* Day headers (md+; on mobile the tabs name the day). */}
            <div
              className={cn("hidden border-b bg-grid-header md:grid", COLS)}
              style={{ height: "var(--grid-header-h)" }}
            >
              <div className="sticky left-0 z-20 bg-grid-header" />
              {order.map((d) => (
                <div
                  key={d}
                  aria-current={d === realToday ? "date" : undefined}
                  className={cn(
                    "grid place-items-center border-l text-sm font-medium",
                    d === realToday && "bg-grid-today font-semibold text-highlight",
                  )}
                >
                  {weekdayLabel(d, intlLocale)}
                </div>
              ))}
            </div>

            <div className={cn("grid", COLS)}>
              {/* Time gutter */}
              <div className="sticky left-0 z-20 bg-card" style={{ height: bodyHeight }}>
                {rowStarts.map((m) => (
                  <div
                    key={m}
                    data-noon-anchor={m === 720 ? "" : undefined}
                    className="pr-2 pt-1 text-right text-xs tabular-nums text-muted-foreground"
                    style={{ height: "var(--grid-row-h)" }}
                  >
                    {/* 15-min rows are too tight to label each one: label every half hour. */}
                    {slot === 15 && m % 30 !== 0 ? null : formatMinutes(m, intlLocale)}
                  </div>
                ))}
              </div>

              {order.map((d) => (
                <div
                  key={d}
                  data-day={d}
                  className={cn(
                    "relative border-l",
                    d === activeDay ? "block" : "hidden md:block",
                    d === realToday && "md:bg-grid-today",
                  )}
                  style={linesBg}
                >
                  {/* Empty cells: pointer shortcut to create a task at this day/time. */}
                  {rowStarts.map((m) => (
                    <button
                      key={m}
                      type="button"
                      tabIndex={-1}
                      aria-label={`${t("grid.addAt", { time: formatMinutes(m, intlLocale) })} (${weekdayLabel(d, intlLocale, "long")})`}
                      className="block w-full cursor-pointer outline-none hover:bg-accent/40"
                      style={{ height: "var(--grid-row-h)" }}
                      onClick={() => {
                        rememberOpener(false)
                        openCreate({ days: [d], startMinute: m })
                      }}
                    />
                  ))}

                  {byDay.get(d)?.map((p) => {
                    const drawnRem = Math.max(p.heightRows * rowRem, MIN_CARD_REM)
                    const compact = drawnRem < COMPACT_BELOW_REM
                    const short = drawnRem < SHORT_BELOW_REM
                    return (
                    <div
                      key={p.id}
                      className="task-card-host absolute z-10"
                      style={{
                        top: `calc(var(--grid-row-h) * ${p.topRows})`,
                        // True times drive layout; only the rendered height has a usable floor.
                        height: `max(calc(var(--grid-row-h) * ${p.heightRows}), var(--task-card-min-h))`,
                        left: `${p.leftPct}%`,
                        width: `${p.widthPct}%`,
                        padding: compact ? "1px var(--task-card-gap)" : "var(--task-card-gap)",
                      }}
                    >
                      <TaskTooltip task={p.task}>
                        <TaskCard
                          task={p.task}
                          category={categoryById.get(p.task.categoryId)}
                          compact={compact}
                          short={short}
                          lines={compact || p.heightRows < 1 ? 1 : p.heightRows < 2 ? 2 : 3}
                          onClick={() => {
                            rememberOpener(true)
                            setDialog({ open: true, task: p.task })
                          }}
                        />
                      </TaskTooltip>
                    </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("grid.empty")}</p>
        )}
      </div>

      <TaskDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        task={dialog.task}
        defaults={dialog.defaults}
        onCloseAutoFocus={restoreFocus}
        categories={categories}
        workspace={workspace}
        weekStart={weekStart}
      />
    </TooltipProvider>
  )
}
