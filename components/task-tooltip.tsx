"use client"

import { useState, type ReactElement } from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip"
import { useT } from "@/lib/i18n/provider"
import type { Task } from "@/lib/types"

function TaskGif({ url, name }: { url: string; name: string }) {
  const { t } = useT()
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URL, no uploads/optimizer
    <img
      src={url}
      alt={`${t("tasks.gifAlt")}: ${name}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mt-2 block h-auto w-auto max-w-full rounded-sm object-contain"
      style={{ maxHeight: "var(--tooltip-gif-max-h)" }}
    />
  )
}

/**
 * Hover/focus tooltip for a task card (delay comes from the grid's TooltipProvider).
 * Top to bottom: name, description, gif; the last two only when filled.
 * `children` is the trigger element (a TaskCard), rendered with asChild so click still works.
 */
export function TaskTooltip({ task, children }: { task: Task; children: ReactElement }) {
  const description = task.description?.trim()
  const gifUrl = task.gifUrl?.trim()
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          side="top"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-max max-w-(--tooltip-max-w) rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        >
          <p className="break-words text-sm font-medium leading-snug">{task.name}</p>
          {description && (
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-snug text-muted-foreground">
              {description}
            </p>
          )}
          {gifUrl && <TaskGif key={gifUrl} url={gifUrl} name={task.name} />}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </Tooltip>
  )
}
