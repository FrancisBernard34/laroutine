"use server"

import { revalidatePath } from "next/cache"
import { updateProfile as dbUpdateProfile } from "@/lib/queries/profile"
import { profileSchema, type ProfileInput } from "@/lib/validation"
import type { ActionResult, Profile } from "@/lib/types"

/** Saves the local single-user profile (no authentication involved). */
export async function updateProfile(input: ProfileInput): Promise<ActionResult<Profile>> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form")
      if (!(key in fieldErrors)) fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }
  const profile = dbUpdateProfile({
    displayName: parsed.data.displayName,
    avatarUrl: parsed.data.avatarUrl || null,
  })
  // The sidebar lives in the root layout.
  revalidatePath("/", "layout")
  return { ok: true, data: profile }
}
