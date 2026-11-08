// Shared types (safe to import from client code; no DB imports here).

export const CATEGORY_COLORS = [
  "orange",
  "red",
  "pink",
  "violet",
  "blue",
  "teal",
  "green",
  "gray",
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];
/** Stored in categories.color: a preset name or a custom lowercase "#rrggbb". */
export type CategoryColorValue = CategoryColor | `#${string}`;

export const LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const WEEK_STARTS = ["sunday", "monday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

/** Values in fieldErrors / error are i18n keys. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; error?: string };

export interface Workspace {
  id: number;
  name: string;
  gridStartHour: number;
  gridEndHour: number;
  slotMinutes: 15 | 30 | 60;
}

export interface Category {
  id: number;
  workspaceId: number;
  name: string;
  icon: string;
  color: CategoryColorValue | null;
}

/** Minutes since 00:00; days 0..6 with 0 = Sunday. */
export interface Task {
  id: number;
  workspaceId: number;
  categoryId: number;
  name: string;
  description: string | null;
  gifUrl: string | null;
  startMinute: number;
  endMinute: number;
  days: number[];
}

export interface Settings {
  language: Locale;
  weekStart: WeekStart;
  /** IANA zone for "now"/"today"; null = automatic (device zone). */
  timezone: string | null;
  activeWorkspaceId: number | null;
}

export interface Profile {
  displayName: string;
  avatarUrl: string | null;
}

export interface CategoryMetric {
  id: number;
  name: string;
  icon: string;
  color: CategoryColorValue | null;
  hours: number;
  taskCount: number;
}

export interface Metrics {
  byCategory: CategoryMetric[];
  /** Index = day (0 = Sunday); always 7 entries. */
  hoursByDay: number[];
  totalTasks: number;
}
