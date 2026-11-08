import { z } from "zod";
import { isHex, normalizeHex } from "./color";
import { TASK_STEP_MINUTES } from "./time";
import { CATEGORY_COLORS, LOCALES, WEEK_STARTS } from "./types";

// Error messages are i18n keys, translated at the call site.

const httpUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "validation.url");

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(60, "validation.tooLong");

export const gridSchema = z
  .object({
    startHour: z.number({ error: "validation.invalidValue" }).int("validation.invalidValue").min(0, "validation.invalidValue").max(23, "validation.invalidValue"),
    endHour: z.number({ error: "validation.invalidValue" }).int("validation.invalidValue").min(1, "validation.invalidValue").max(24, "validation.invalidValue"),
    slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)], { error: "validation.invalidValue" }),
  })
  .refine((g) => g.endHour > g.startHour, {
    path: ["endHour"],
    message: "validation.gridEndAfterStart",
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(40, "validation.tooLong"),
  icon: z.string().min(1, "validation.required"),
  color: z
    .union(
      [
        z.enum(CATEGORY_COLORS),
        z
          .string()
          .trim()
          .refine(isHex)
          .transform((v) => normalizeHex(v) as `#${string}`),
      ],
      { error: "validation.color" },
    )
    .nullable(),
});

export const taskSchema = z
  .object({
    name: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong"),
    description: z.string().trim().optional(),
    gifUrl: httpUrl.optional(),
    categoryId: z.number({ error: "validation.required" }).int("validation.required").positive("validation.required"),
    startMinute: z.number({ error: "validation.invalidValue" }).int("validation.invalidValue").min(0, "validation.invalidValue").max(1439, "validation.invalidValue"),
    endMinute: z.number({ error: "validation.invalidValue" }).int("validation.invalidValue").min(1, "validation.invalidValue").max(1440, "validation.invalidValue"),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, "validation.daysRequired"),
  })
  .refine((t) => t.endMinute > t.startMinute, {
    path: ["endMinute"],
    message: "validation.endAfterStart",
  })
  .refine((t) => t.startMinute % TASK_STEP_MINUTES === 0, {
    path: ["startMinute"],
    message: "validation.invalidValue",
  })
  .refine((t) => t.endMinute % TASK_STEP_MINUTES === 0, {
    path: ["endMinute"],
    message: "validation.invalidValue",
  });

export const settingsSchema = z.object({
  language: z.enum(LOCALES, { error: "validation.invalidValue" }),
  weekStart: z.enum(WEEK_STARTS, { error: "validation.invalidValue" }),
  // null = automatic (device zone). Any zone Intl accepts is valid; not limited to supportedValuesOf.
  timezone: z
    .string({ error: "validation.invalidValue" })
    .max(64, "validation.invalidValue")
    .refine(isValidTimeZone, "validation.invalidValue")
    .nullable(),
});

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, "validation.tooLong"),
  avatarUrl: httpUrl.optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type GridInput = z.infer<typeof gridSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
