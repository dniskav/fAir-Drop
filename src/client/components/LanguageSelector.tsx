import React from 'react'
import { useTranslation, localeLabels } from '../i18n'
import type { Locale } from '../i18n/types'

const locales = Object.keys(localeLabels) as Locale[]

interface Props {
  inline?: boolean
}

export default function LanguageSelector({ inline }: Props) {
  const { locale, setLocale } = useTranslation()

  return (
    <select
      className={inline ? 'lang-select lang-select--inline' : 'lang-select'}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeLabels[l]}
        </option>
      ))}
    </select>
  )
}
