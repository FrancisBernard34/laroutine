"use server"

import { revalidatePath } from "next/cache"
import { getCategory } from "@/lib/queries/categories"
import {
  createTask as dbCreateTask,
  deleteTask as dbDeleteTask,
  getTask,
  updateTask as dbUpdateTask,
} from "@/lib/queries/tasks"
import { getActiveWorkspace } from "@/lib/queries/workspaces"
import { taskSchema, type TaskInput } from "@/lib/validation"
import type { ActionResult, Task, Workspace } from "@/lib/types"

function refresh() {
  revalidatePath("/", "layout")
}

function fieldErrorsOf(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "name")
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

/** Shared checks: zod, category in the active workspace, times inside the grid. */
function validate(
  input: TaskInput,
  ws: Workspace,
): { ok: true; data: TaskInput } | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  const errors: Record<string, string> = {}
  const cat = getCategory(parsed.data.categoryId)
  if (!cat || cat.workspaceId !== ws.id) errors.categoryId = "tasks.categoryInvalid"
  if (parsed.data.startMinute < ws.gridStartHour * 60) errors.startMinute = "validation.outsideGrid"
  if (parsed.data.endMinute > ws.gridEndHour * 60) errors.endMinute = "validation.outsideGrid"
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors }
  return { ok: true, data: parsed.data }
}

export async function createTask(input: TaskInput): Promise<ActionResult<Task>> {
  const ws = getActiveWorkspace()
  const v = validate(input, ws)
  if (!v.ok) return { ok: false, fieldErrors: v.fieldErrors }
  const task = dbCreateTask(ws.id, v.data)
  refresh()
  return { ok: true, data: task }
}

export async function updateTask(id: number, input: TaskInput): Promise<ActionResult<Task>> {
  const ws = getActiveWorkspace()
  const existing = Number.isInteger(id) ? getTask(id) : null
  if (!existing || existing.workspaceId !== ws.id) return { ok: false, error: "tasks.notFound" }
  const v = validate(input, ws)
  if (!v.ok) return { ok: false, fieldErrors: v.fieldErrors }
  const task = dbUpdateTask(id, v.data)
  if (!task) return { ok: false, error: "tasks.notFound" }
  refresh()
  return { ok: true, data: task }
}

export async function deleteTask(id: number): Promise<ActionResult> {
  const existing = Number.isInteger(id) ? getTask(id) : null
  if (!existing || existing.workspaceId !== getActiveWorkspace().id) {
    return { ok: false, error: "tasks.notFound" }
  }
  dbDeleteTask(id)
  refresh()
  return { ok: true, data: undefined }
}
