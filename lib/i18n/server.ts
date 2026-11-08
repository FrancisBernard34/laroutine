import { getSettings } from "../queries/settings"
import type { Locale } from "../types"
import { intlLocaleOf, makeT, type TFunction } from "./index.ts"

/** Server-side translation helper bound to the saved language. */
export function getT(): { locale: Locale; intlLocale: string; t: TFunction } {
  const { language } = getSettings()
  return { locale: language, intlLocale: intlLocaleOf(language), t: makeT(language) }
}
