"use server"

import { revalidatePath } from "next/cache"
import {
  createCategory as dbCreateCategory,
  deleteCategory as dbDeleteCategory,
  getCategory,
  updateCategory as dbUpdateCategory,
} from "@/lib/queries/categories"
import { getActiveWorkspace } from "@/lib/queries/workspaces"
import { categorySchema, type CategoryInput } from "@/lib/validation"
import type { ActionResult, Category } from "@/lib/types"

function refresh() {
  revalidatePath("/", "layout")
}

function isUniqueViolation(e: unknown) {
  return e instanceof Error && /UNIQUE constraint failed/i.test(e.message)
}

function fieldErrorsOf(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "name")
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

/** Creates a category in the ACTIVE workspace and returns it (for callers like the task dialog). */
export async function createCategory(input: CategoryInput): Promise<ActionResult<Category>> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  try {
    const cat = dbCreateCategory(getActiveWorkspace().id, parsed.data)
    refresh()
    return { ok: true, data: cat }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, fieldErrors: { name: "categories.duplicate" } }
    throw e
  }
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<ActionResult<Category>> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) }
  const existing = Number.isInteger(id) ? getCategory(id) : null
  if (!existing || existing.workspaceId !== getActiveWorkspace().id) {
    return { ok: false, error: "categories.notFound" }
  }
  try {
    const cat = dbUpdateCategory(id, parsed.data)
    if (!cat) return { ok: false, error: "categories.notFound" }
    refresh()
    return { ok: true, data: cat }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, fieldErrors: { name: "categories.duplicate" } }
    throw e
  }
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  const existing = Number.isInteger(id) ? getCategory(id) : null
  if (!existing || existing.workspaceId !== getActiveWorkspace().id) {
    return { ok: false, error: "categories.notFound" }
  }
  const res = dbDeleteCategory(id)
  if (res === "in_use") return { ok: false, error: "categories.inUse" }
  if (res === "not_found") return { ok: false, error: "categories.notFound" }
  refresh()
  return { ok: true, data: undefined }
}
