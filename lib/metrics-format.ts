import { orderedDays, weekdayLabel } from "./time.ts";
import type { CategoryMetric, WeekStart } from "./types";

/** One chart datum. `color` is a category color key (or null) for category charts. */
export interface ChartDatum {
  key: string;
  name: string;
  value: number;
  color: CategoryMetric["color"];
}

/** "6 h" / "6h" (unit style, locale aware, at most 2 decimals). */
export function formatHours(hours: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "narrow",
    maximumFractionDigits: 2,
  }).format(hours);
}

/** Plain localized number (axis ticks, counts). */
export function formatNumber(n: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 }).format(n);
}

/** Per-day hours in the week-start order with localized weekday names. */
export function dayChartData(
  hoursByDay: number[],
  weekStart: WeekStart,
  intlLocale: string,
): ChartDatum[] {
  return orderedDays(weekStart).map((d) => ({
    key: String(d),
    name: weekdayLabel(d, intlLocale, "short"),
    value: hoursByDay[d] ?? 0,
    color: null,
  }));
}

/** Category series sorted by value (desc, then name). `includeZero=false` drops empty entries. */
export function categoryChartData(
  byCategory: CategoryMetric[],
  metric: "hours" | "taskCount",
  includeZero = false,
): ChartDatum[] {
  return byCategory
    .map((c) => ({ key: String(c.id), name: c.name, value: c[metric], color: c.color }))
    .filter((d) => includeZero || d.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}
