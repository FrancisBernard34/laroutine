"use server"

import { revalidatePath } from "next/cache"
import { updateSettings as dbUpdateSettings } from "@/lib/queries/settings"
import { getActiveWorkspace, updateWorkspaceGrid as dbUpdateWorkspaceGrid } from "@/lib/queries/workspaces"
import { gridSchema, settingsSchema, type GridInput, type SettingsInput } from "@/lib/validation"
import type { ActionResult, Settings, Workspace } from "@/lib/types"

function refresh() {
  // Language / week start / grid affect the root layout (html lang, sidebar) and every page.
  revalidatePath("/", "layout")
}

function fieldErrorsOf(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

/** Saves language, week start and time zone. */
export async function updateSettings(input: SettingsInput): Promise<ActionResult<Settings>> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  const settings = dbUpdateSettings(parsed.data)
  refresh()
  return { ok: true, data: settings }
}

/** Saves the grid (start/end hour, slot size) of the ACTIVE workspace. */
export async function updateWorkspaceGrid(input: GridInput): Promise<ActionResult<Workspace>> {
  const parsed = gridSchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  const ws = dbUpdateWorkspaceGrid(getActiveWorkspace().id, parsed.data)
  if (!ws) return { ok: false, error: "workspace.notFound" }
  refresh()
  return { ok: true, data: ws }
}
