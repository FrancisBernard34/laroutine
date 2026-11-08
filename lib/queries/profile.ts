import { getDb } from "../db";
import type { Profile } from "../types";

interface ProfileRow {
  display_name: string;
  avatar_url: string | null;
}

export function getProfile(): Profile {
  const r = getDb()
    .prepare("SELECT display_name, avatar_url FROM profile WHERE id = 1")
    .get() as ProfileRow;
  return { displayName: r.display_name, avatarUrl: r.avatar_url };
}

export function updateProfile(input: { displayName: string; avatarUrl?: string | null }): Profile {
  getDb()
    .prepare("UPDATE profile SET display_name = ?, avatar_url = ? WHERE id = 1")
    .run(input.displayName, input.avatarUrl?.trim() || null);
  return getProfile();
}
