import { createContext, useContext } from 'react'
import type { ThemeFamily, ThemePref } from './theme'

export interface ThemeContextValue extends ThemePref {
  setFamily: (family: ThemeFamily) => void
  toggleDark: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
