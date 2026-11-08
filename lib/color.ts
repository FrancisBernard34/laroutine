// Color helpers shared by the picker, the renderers (cards, lists, charts) and validation.
// Pure and dependency-free (safe for client, server and node --test).
import { CATEGORY_COLORS } from "./types.ts";

export interface Hsv {
  /** 0..360 */
  h: number;
  /** 0..100 */
  s: number;
  /** 0..100 */
  v: number;
}

const HEX_INPUT = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const HEX_STORED = /^#[0-9a-f]{6}$/;

/** True for "#rgb" / "#rrggbb" in any case (what a user may type). */
export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX_INPUT.test(value);
}

/** True only for the canonical stored form: lowercase "#rrggbb". */
export function isStoredHex(value: unknown): value is string {
  return typeof value === "string" && HEX_STORED.test(value);
}

/** "#ABC" / "#AABBCC" -> "#aabbcc"; anything else -> null. */
export function normalizeHex(value: unknown): string | null {
  if (!isHex(value)) return null;
  const v = value.slice(1).toLowerCase();
  const full = v.length === 3 ? [...v].map((c) => c + c).join("") : v;
  return `#${full}`;
}

export interface HexFieldState {
  /** Committed color the form should hold (never derived from an incomplete string). */
  value: string | null;
  /** Text to show in the hex field (without "#"). */
  text: string;
  invalid: boolean;
}

/**
 * Hex text field logic. While typing ("input") only a COMPLETE 6-digit hex updates the value;
 * "#rgb" shorthand (and reverting an invalid/empty field) happens on "commit" (blur / Enter).
 */
export function hexFieldReduce(committed: string | null, text: string, event: "input" | "commit"): HexFieldState {
  const full = normalizeHex(`#${text}`);
  if (event === "input") {
    if (text.length === 6 && full) return { value: full, text, invalid: false };
    // 3 digits is a valid shorthand awaiting commit: not flagged, but not applied either.
    return { value: committed, text, invalid: text.length > 0 && !full };
  }
  if (full) return { value: full, text: full.slice(1), invalid: false };
  return { value: committed, text: committed ? committed.slice(1) : "", invalid: false };
}

export function isPresetColor(value: unknown): boolean {
  return typeof value === "string" && (CATEGORY_COLORS as readonly string[]).includes(value);
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
  const sn = s / 100;
  const vn = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return vn - vn * sn * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}

export function hexToHsv(hex: string): Hsv | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsv(...rgb) : null;
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(...hsvToRgb(hsv));
}

/** WCAG 2.x relative luminance (0..1). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1..21) between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever has the higher WCAG contrast on `hex` (icon color on a tile). */
export function readableForeground(hex: string): "#000000" | "#ffffff" {
  return contrastRatio(hex, "#000000") >= contrastRatio(hex, "#ffffff") ? "#000000" : "#ffffff";
}

/** CSS color for a stored category color: hex as-is, preset -> var(--cat-*), null -> gray. */
export function categoryColorCss(color: string | null | undefined): string {
  if (isStoredHex(color)) return color;
  return `var(--cat-${isPresetColor(color) ? color : "gray"})`;
}

/** Subtle outline that keeps very light/dark custom colors visible on both themes. */
export const COLOR_RING = "color-mix(in oklab, var(--foreground) 30%, transparent)";
