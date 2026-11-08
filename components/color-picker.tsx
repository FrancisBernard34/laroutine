"use client"

import { createElement, useId, useRef, useState } from "react"
import { Ban, Check } from "lucide-react"

import { Input } from "@/components/ui/input"
import { categoryColorVar, categoryTileStyle, getCategoryIcon } from "@/lib/category-icons"
import { hexToHsv, hsvToHex, hexFieldReduce, isStoredHex, readableForeground, type Hsv } from "@/lib/color"
import { useT } from "@/lib/i18n/provider"
import { CATEGORY_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEED: Hsv = { h: 252, s: 62, v: 96 }
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Drag surface shared by the 2D area and the hue slider. Pointer events + capture, so mouse, touch
 * and pen all work; `touch-action: none` keeps the page from scrolling while dragging.
 */
function useDrag(onMove: (x: number, y: number) => void) {
  const dragging = useRef(false)
  const at = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onMove(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1))
  }
  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0 && e.pointerType === "mouse") return
      dragging.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.focus()
      at(e)
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (dragging.current) at(e)
    },
    onPointerUp(e: React.PointerEvent<HTMLElement>) {
      dragging.current = false
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    },
    onPointerCancel() {
      dragging.current = false
    },
  }
}

const HANDLE =
  "pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.35)] transition-[box-shadow] group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-popover"

/** Category tile (icon block + name) as drawn on schedule cards, for the live preview. */
function PreviewTile({ color, icon, name }: { color: string | null; icon: string; name: string }) {
  return (
    <div
      className="flex h-11 min-w-0 overflow-hidden rounded-lg text-card-foreground"
      style={{ background: `color-mix(in oklab, ${categoryColorVar(color)} 16%, var(--card))` }}
    >
      <span
        className="grid w-11 shrink-0 place-items-center text-cat-foreground"
        style={categoryTileStyle(color)}
        aria-hidden
      >
        {createElement(getCategoryIcon(icon), { className: "size-5" })}
      </span>
      <span className="min-w-0 flex-1 self-center truncate px-2.5 text-[13px] font-medium">{name}</span>
    </div>
  )
}

/**
 * Category color picker: preset swatches (+ "no color") and an inline custom picker
 * (saturation/brightness area, hue slider, hex field) with a live preview on both surfaces.
 * Inline (not a popover) so it can never be clipped by, or fight with, the nested dialogs.
 */
export function ColorPicker({
  value,
  onChange,
  icon,
  name,
  labelledBy,
}: {
  value: string | null
  onChange: (color: string | null) => void
  icon: string
  name: string
  labelledBy: string
}) {
  const { t } = useT()
  const uid = useId()
  const custom = isStoredHex(value)
  const [open, setOpen] = useState(custom)
  // HSV is kept locally: hex -> HSV loses the hue at s=0 / v=0 (black, white, greys).
  const [hsv, setHsv] = useState<Hsv>(() => (custom ? hexToHsv(value) : null) ?? SEED)
  const [hexText, setHexText] = useState(custom ? value.slice(1) : "")
  const [hexInvalid, setHexInvalid] = useState(false)

  function applyHsv(next: Hsv) {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexText(hex.slice(1))
    setHexInvalid(false)
    onChange(hex)
  }

  function applyHexField(text: string, event: "input" | "commit") {
    const r = hexFieldReduce(custom ? value : null, text, event)
    setHexText(r.text)
    setHexInvalid(r.invalid)
    if (r.value && r.value !== value) {
      const next = hexToHsv(r.value)!
      // Keep the current hue for greys so the slider does not jump.
      setHsv(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next)
      onChange(r.value)
    }
  }

  function onHexInput(raw: string) {
    applyHexField(raw.replace(/^#/, "").slice(0, 6), "input")
  }

  function toggleCustom() {
    if (!custom) {
      setOpen(true)
      applyHsv(hsv)
    } else {
      setOpen((o) => !o)
    }
  }

  function choosePreset(c: string | null) {
    onChange(c)
    setHexInvalid(false)
  }

  const areaDrag = useDrag((x, y) => applyHsv({ ...hsv, s: x * 100, v: (1 - y) * 100 }))
  const hueDrag = useDrag((x) => applyHsv({ ...hsv, h: x * 360 }))
  const panelId = `${uid}-panel`

  function areaKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
      PageUp: [0, 10],
      PageDown: [0, -10],
    }
    const m = d[e.key]
    if (!m) return
    e.preventDefault()
    applyHsv({ ...hsv, s: clamp(hsv.s + m[0], 0, 100), v: clamp(hsv.v + m[1], 0, 100) })
  }

  function hueKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1
    let h = hsv.h
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") h -= step
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") h += step
    else if (e.key === "PageDown") h -= 30
    else if (e.key === "PageUp") h += 30
    else if (e.key === "Home") h = 0
    else if (e.key === "End") h = 360
    else return
    e.preventDefault()
    applyHsv({ ...hsv, h: clamp(h, 0, 360) })
  }

  const ringSel = "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
  const swatch =
    "relative grid size-9 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
  const hueColor = hsvToHex({ h: hsv.h, s: 100, v: 100 })
  const h = Math.round(hsv.h)
  const s = Math.round(hsv.s)
  const v = Math.round(hsv.v)
  const shownName = name.trim() || t("categories.colorPreviewName")

  return (
    <div className="grid gap-3">
      <div role="group" aria-labelledby={labelledBy} className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("categories.colorPresets")}</span>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-pressed={value === null}
            aria-label={t("categories.colorNone")}
            title={t("categories.colorNone")}
            onClick={() => choosePreset(null)}
            className={cn(swatch, "border text-muted-foreground", value === null && ringSel)}
          >
            <Ban className="size-4" aria-hidden />
          </button>
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={value === c}
              aria-label={t(`color.${c}`)}
              title={t(`color.${c}`)}
              onClick={() => choosePreset(c)}
              style={{ backgroundColor: categoryColorVar(c) }}
              className={cn(swatch, "text-cat-foreground", value === c && ringSel)}
            >
              {value === c && <Check className="size-4" aria-hidden />}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-pressed={custom}
            aria-label={custom ? t("categories.colorCustomValue", { hex: value }) : t("categories.colorCustom")}
            title={t("categories.colorCustom")}
            onClick={toggleCustom}
            style={
              custom
                ? { backgroundColor: value }
                : { background: "conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171)" }
            }
            className={cn(swatch, custom && ["border border-foreground/30", ringSel])}
          >
            {custom ? (
              <Check className="size-4" style={{ color: readableForeground(value) }} aria-hidden />
            ) : (
              <span className="size-3.5 rounded-full bg-popover shadow-sm" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div
          id={panelId}
          className="grid gap-4 rounded-xl border bg-card p-3 text-card-foreground shadow-sm sm:p-4"
        >
          <span className="text-xs font-medium text-muted-foreground">{t("categories.colorCustom")}</span>

          {/* Saturation (x) / brightness (y) */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={t("categories.colorArea")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={s}
            aria-valuetext={t("categories.colorAreaValue", { s, v })}
            onKeyDown={areaKey}
            {...areaDrag}
            className="group relative h-40 w-full cursor-crosshair touch-none select-none rounded-lg outline-none ring-1 ring-inset ring-black/10 sm:h-44"
            style={{
              backgroundColor: hueColor,
              backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
          >
            <span
              className={HANDLE}
              style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hsvToHex(hsv) }}
            />
          </div>

          {/* Hue */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={t("categories.colorHue")}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={h}
            aria-valuetext={t("categories.colorHueValue", { h })}
            onKeyDown={hueKey}
            {...hueDrag}
            className="group relative h-6 w-full cursor-pointer touch-none select-none rounded-full outline-none ring-1 ring-inset ring-black/10"
            style={{
              backgroundImage:
                "linear-gradient(to right, #f00 0%, #ff0 16.667%, #0f0 33.333%, #0ff 50%, #00f 66.667%, #f0f 83.333%, #f00 100%)",
            }}
          >
            <span className={HANDLE} style={{ left: `${(hsv.h / 360) * 100}%`, top: "50%", backgroundColor: hueColor }} />
          </div>

          {/* Hex */}
          <div className="grid gap-1.5">
            <label htmlFor={`${uid}-hex`} className="text-xs font-medium text-muted-foreground">
              {t("categories.colorHex")}
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground"
              >
                #
              </span>
              <Input
                id={`${uid}-hex`}
                value={hexText}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                inputMode="text"
                aria-invalid={hexInvalid ? true : undefined}
                aria-describedby={hexInvalid ? `${uid}-hex-error` : undefined}
                onChange={(e) => onHexInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyHexField(hexText, "commit")
                }}
                onBlur={() => applyHexField(hexText, "commit")}
                className="pl-7 font-mono uppercase"
              />
            </div>
            {/* Space is always reserved so the layout does not jump (and swallow a click) when the error clears on blur. */}
            <div className="min-h-4">
              {hexInvalid && (
                <p id={`${uid}-hex-error`} role="alert" className="text-xs leading-4 text-destructive">
                  {t("categories.colorHexError")}
                </p>
              )}
            </div>

          </div>

          {/* Preview on both surfaces */}
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("categories.colorPreview")}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["dark", "light"] as const).map((theme) => (
                <div
                  key={theme}
                  className={cn("grid gap-1.5 rounded-lg border bg-background p-2 text-foreground", theme)}
                  style={{ borderColor: `color-mix(in oklab, var(--foreground) 14%, transparent)` }}
                >
                  <span className="text-[11px] leading-none text-muted-foreground">
                    {t(theme === "dark" ? "categories.colorPreviewDark" : "categories.colorPreviewLight")}
                  </span>
                  <PreviewTile color={value} icon={icon} name={shownName} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
