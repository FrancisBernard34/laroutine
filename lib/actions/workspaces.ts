"use server"

import { revalidatePath } from "next/cache"
import {
  createWorkspace as dbCreateWorkspace,
  deleteWorkspace as dbDeleteWorkspace,
  setActiveWorkspace as dbSetActiveWorkspace,
} from "@/lib/queries/workspaces"
import { workspaceNameSchema } from "@/lib/validation"
import type { ActionResult, Workspace } from "@/lib/types"

function refresh() {
  revalidatePath("/", "layout")
}

export async function createWorkspace(name: string): Promise<ActionResult<Workspace>> {
  const parsed = workspaceNameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, fieldErrors: { name: parsed.error.issues[0].message } }
  }
  const ws = dbCreateWorkspace(parsed.data)
  refresh()
  return { ok: true, data: ws }
}

export async function setActiveWorkspace(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || !dbSetActiveWorkspace(id)) {
    return { ok: false, error: "workspace.notFound" }
  }
  refresh()
  return { ok: true, data: undefined }
}

export async function deleteWorkspace(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || !dbDeleteWorkspace(id)) {
    return { ok: false, error: "workspace.cannotDelete" }
  }
  refresh()
  return { ok: true, data: undefined }
}
