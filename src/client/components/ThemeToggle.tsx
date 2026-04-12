import React from 'react'
import { useTranslation } from '../i18n'

interface Props {
  theme: 'light' | 'dark'
  onToggle: () => void
  inline?: boolean
}

export default function ThemeToggle({ theme, onToggle, inline }: Props) {
  const { t } = useTranslation()
  return (
    <button
      className={inline ? 'theme-toggle theme-toggle--inline' : 'theme-toggle'}
      onClick={onToggle}
      aria-label={theme === 'dark' ? t.theme.toLight : t.theme.toDark}
      title={theme === 'dark' ? t.theme.light : t.theme.dark}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.07" y1="4.93" x2="17.3" y2="6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6.7" y1="17.3" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
