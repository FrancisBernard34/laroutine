"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { Locale } from "../types"
import { intlLocaleOf, makeT, type TFunction } from "./index.ts"

interface I18n {
  locale: Locale
  /** BCP-47 tag for Intl (pt-BR or en-US). */
  intlLocale: string
  t: TFunction
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18n>(
    () => ({ locale, intlLocale: intlLocaleOf(locale), t: makeT(locale) }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>")
  return ctx
}
