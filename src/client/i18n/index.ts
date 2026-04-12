import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Translations, Locale } from './types'
import es from './locales/es'
import en from './locales/en'
import fr from './locales/fr'
import de from './locales/de'

const STORAGE_KEY = 'fairdrop-locale'

const locales: Record<Locale, Translations> = { es, en, fr, de }

export const localeLabels: Record<Locale, string> = {
  es: '🇪🇸 ES',
  en: '🇬🇧 EN',
  fr: '🇫🇷 FR',
  de: '🇩🇪 DE',
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in locales) return stored
  } catch {}
  const lang = navigator.language.slice(0, 2) as Locale
  return lang in locales ? lang : 'es'
}

interface LocaleContextValue {
  t: Translations
  locale: Locale
  setLocale: (l: Locale) => void
}

export const LocaleContext = createContext<LocaleContextValue>({
  t: es,
  locale: 'es',
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {}
  }, [])

  return React.createElement(
    LocaleContext.Provider,
    { value: { t: locales[locale], locale, setLocale } },
    children,
  )
}

export function useTranslation() {
  return useContext(LocaleContext)
}
