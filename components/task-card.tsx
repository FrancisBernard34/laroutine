import { createElement, type ComponentProps } from "react"

import { categoryColorVar, getCategoryIcon } from "@/lib/category-icons"
import { COLOR_RING, isStoredHex, readableForeground } from "@/lib/color"
import { cn } from "@/lib/utils"
import type { Category, Task } from "@/lib/types"

/**
 * Two blocks: 20% category icon (always) / 80% task name. Plain <button> that forwards props and ref,
 * so it can be wrapped with <TooltipTrigger asChild>.
 */
export function TaskCard({
  task,
  category,
  lines = 3,
  compact = false,
  short = false,
  className,
  style,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  task: Task
  category: Category | undefined
  /** Max name lines that fit the card height. */
  lines?: number
  /** Very short card: icon + single truncated line. */
  compact?: boolean
  /** Short card (under 2.5rem): compact layout when it is also narrow. */
  short?: boolean
}) {
  const Icon = getCategoryIcon(category?.icon)
  return (
    <button
      type="button"
      className={cn(
        "task-card outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring",
        compact && "task-card-compact",
        short && "task-card-short",
        className,
      )}
      style={{
        ["--cat" as string]: categoryColorVar(category?.color),
        // Custom colors: legible icon (black/white by WCAG contrast) + a subtle ring on the icon block.
        ...(isStoredHex(category?.color)
          ? {
              ["--cat-foreground" as string]: readableForeground(category.color),
              ["--cat-ring" as string]: `inset 0 0 0 1px ${COLOR_RING}`,
            }
          : null),
        ...style,
      }}
      {...props}
    >
      <span className="task-card-icon" aria-hidden>
        {createElement(Icon, { className: "size-4" })}
      </span>
      <span className="task-card-name">
        <span
          className="block min-w-0 break-words"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: lines,
            overflow: "hidden",
          }}
        >
          {task.name}
        </span>
      </span>
    </button>
  )
}
