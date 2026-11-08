import { getDb } from "../db";
import type { Locale, Settings, WeekStart } from "../types";

interface SettingsRow {
  language: Locale;
  week_start: WeekStart;
  timezone: string | null;
  active_workspace_id: number | null;
}

export function getSettings(): Settings {
  const r = getDb()
    .prepare(
      "SELECT language, week_start, timezone, active_workspace_id FROM settings WHERE id = 1",
    )
    .get() as SettingsRow;
  return {
    language: r.language,
    weekStart: r.week_start,
    timezone: r.timezone,
    activeWorkspaceId: r.active_workspace_id,
  };
}

export function updateSettings(input: {
  language: Locale;
  weekStart: WeekStart;
  timezone: string | null;
}): Settings {
  getDb()
    .prepare("UPDATE settings SET language = ?, week_start = ?, timezone = ? WHERE id = 1")
    .run(input.language, input.weekStart, input.timezone);
  return getSettings();
}
