import type { WeekStart, Workspace } from "./types";

/** Minutes since 00:00 -> localized clock label (UTC avoids DST artifacts). 1440 renders as midnight. */
export function formatMinutes(minutes: number, intlLocale: string): string {
  // pt-BR: 24h "06:00"; en-US: "6:00 AM".
  const h24 = intlLocale.startsWith("pt");
  return new Intl.DateTimeFormat(intlLocale, {
    hour: h24 ? "2-digit" : "numeric",
    minute: "2-digit",
    hourCycle: h24 ? "h23" : "h12",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(1970, 0, 1, 0, minutes)));
}

/** Weekday label for day 0..6 (0 = Sunday). */
export function weekdayLabel(
  day: number,
  intlLocale: string,
  style: "short" | "long" = "short",
): string {
  // 2024-01-07 is a Sunday.
  return new Intl.DateTimeFormat(intlLocale, { weekday: style, timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, 0, 7 + day)),
  );
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partsInZone(date: Date, timeZone: string | undefined) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
}

/**
 * Weekday (0 = Sunday) and minutes since midnight at `date` in the IANA zone `tz`.
 * null/undefined = device zone; an invalid zone also falls back to the device zone.
 */
export function nowInZone(
  tz: string | null | undefined,
  date: Date = new Date(),
): { day: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = partsInZone(date, tz || undefined);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    parts = partsInZone(date, undefined);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

export function orderedDays(weekStart: WeekStart): number[] {
  return weekStart === "monday" ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

/** Task start/end times are always chosen in this step, independent of the grid slot interval. */
export const TASK_STEP_MINUTES = 15;

/** Selectable task times (every 15 min) from grid start to grid end (inclusive). */
export function taskTimes(ws: Pick<Workspace, "gridStartHour" | "gridEndHour">): number[] {
  const out: number[] = [];
  for (let m = ws.gridStartHour * 60; m <= ws.gridEndHour * 60; m += TASK_STEP_MINUTES) out.push(m);
  return out;
}

/** Slot boundary minutes from grid start to grid end (inclusive). */
export function slotTimes(
  ws: Pick<Workspace, "gridStartHour" | "gridEndHour" | "slotMinutes">,
): number[] {
  const out: number[] = [];
  for (let m = ws.gridStartHour * 60; m <= ws.gridEndHour * 60; m += ws.slotMinutes) out.push(m);
  return out;
}
