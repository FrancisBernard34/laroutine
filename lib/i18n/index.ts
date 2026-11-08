// Shared (server + client safe) i18n core: typed dictionaries and pure helpers.
import type { Locale } from "../types"
import { en } from "./en.ts"
import { ptBR, type Dictionary, type StringKey } from "./pt-BR.ts"

export type { Dictionary, StringKey }

export const DEFAULT_LOCALE: Locale = "pt-BR"

export const DICTIONARIES: Record<Locale, Dictionary> = { "pt-BR": ptBR, en }

/** BCP-47 tag handed to Intl: pt-BR formats 24h, English (en-US) formats AM/PM. */
export function intlLocaleOf(locale: Locale): string {
  return locale === "en" ? "en-US" : "pt-BR"
}

export type TParams = Record<string, string | number>

/**
 * Translates a key for a locale, replacing `{name}` placeholders.
 * Unknown keys never leak: key-shaped strings fall back to the generic error message.
 */
export function translate(locale: Locale, key: string | null | undefined, params?: TParams): string {
  if (!key) return ""
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
  let text: string
  if (key in dict) text = dict[key as StringKey]
  else if (/^[a-z]+(\.[A-Za-z0-9]+)+$/.test(key)) text = dict["error.generic"]
  else return key
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v))
  }
  return text
}

export type TFunction = (key: string | null | undefined, params?: TParams) => string

export function makeT(locale: Locale): TFunction {
  return (key, params) => translate(locale, key, params)
}
